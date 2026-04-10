const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/cards
router.get('/', async (req, res, next) => {
  try {
    const { set, condition, sort = 'created_at', order = 'DESC', search } = req.query;
    let conditions = [`COALESCE(c.status, 'active') = 'active'`];
    let params = [];
    let i = 1;

    if (set) {
      conditions.push(`set_name ILIKE $${i++}`);
      params.push(`%${set}%`);
    }
    if (condition) {
      conditions.push(`condition ILIKE $${i++}`);
      params.push(`%${condition}%`);
    }
    if (search) {
      conditions.push(`(name ILIKE $${i} OR set_name ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const allowedSorts = ['name', 'set_name', 'card_number', 'purchase_price', 'market_price', 'purchase_date', 'created_at', 'quantity', 'total_market_value', 'unrealized_profit', 'roi_pct'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const result = await query(
      `SELECT c.*,
        COALESCE(c.market_price, 0) * c.quantity AS total_market_value,
        COALESCE(c.purchase_price, 0) * c.quantity AS total_purchase_value,
        (COALESCE(c.market_price, 0) - COALESCE(c.purchase_price, 0)) * c.quantity AS unrealized_profit,
        CASE WHEN COALESCE(c.purchase_price, 0) > 0
          THEN ((COALESCE(c.market_price, 0) - COALESCE(c.purchase_price, 0)) / c.purchase_price * 100)
          ELSE 0 END AS roi_pct
       FROM cards c
       ${whereClause}
       ORDER BY ${sortCol} ${sortDir}`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/cards/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM cards WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Card not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/cards
router.post('/', async (req, res, next) => {
  try {
    const {
      name, set_name, card_number, condition, quantity = 1,
      purchase_price, purchase_date, notes,
      pokemon_tcg_id, market_price, image_url, set_id
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Card name is required' });

    const result = await query(
      `INSERT INTO cards
        (name, set_name, card_number, condition, quantity, purchase_price, purchase_date,
         notes, pokemon_tcg_id, market_price, image_url, set_id, last_price_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, $13)
       RETURNING *`,
      [name, set_name, card_number, condition, quantity, purchase_price || null,
       purchase_date || null, notes, pokemon_tcg_id, market_price || null,
       image_url, set_id, market_price ? new Date() : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/cards/:id
router.put('/:id', async (req, res, next) => {
  try {
    const {
      name, set_name, card_number, condition, quantity,
      purchase_price, purchase_date, notes,
      pokemon_tcg_id, market_price, image_url, set_id
    } = req.body;

    const result = await query(
      `UPDATE cards SET
        name=$1, set_name=$2, card_number=$3, condition=$4, quantity=$5,
        purchase_price=$6, purchase_date=$7, notes=$8,
        pokemon_tcg_id=$9, market_price=$10, image_url=$11, set_id=$12,
        updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [name, set_name, card_number, condition, quantity,
       purchase_price || null, purchase_date || null, notes,
       pokemon_tcg_id, market_price || null, image_url, set_id, req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Card not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/cards/:id/sell — mark card as sold and create eBay listing
router.put('/:id/sell', async (req, res, next) => {
  try {
    const { sold_price, sold_date, shipping_cost = 0, ebay_fee_rate, ebay_fee_fixed } = req.body;
    if (!sold_price) return res.status(400).json({ error: 'sold_price is required' });

    const cardResult = await query('SELECT * FROM cards WHERE id=$1', [req.params.id]);
    if (!cardResult.rows.length) return res.status(404).json({ error: 'Card not found' });
    const card = cardResult.rows[0];

    let feeRate = ebay_fee_rate;
    let feeFixed = ebay_fee_fixed;
    if (feeRate == null || feeFixed == null) {
      const settings = await query(`SELECT key, value FROM settings WHERE key IN ('ebay_fee_rate', 'ebay_fee_fixed')`);
      const settingsMap = Object.fromEntries(settings.rows.map(r => [r.key, parseFloat(r.value)]));
      feeRate = feeRate ?? settingsMap.ebay_fee_rate ?? 0.1325;
      feeFixed = feeFixed ?? settingsMap.ebay_fee_fixed ?? 0.30;
    }

    const feesTotal = (sold_price * feeRate + parseFloat(feeFixed)).toFixed(2);
    const netProfit = (sold_price - feesTotal - parseFloat(shipping_cost)).toFixed(2);
    const saleDate = sold_date || new Date().toISOString().split('T')[0];

    const listing = await query(
      `INSERT INTO ebay_listings
        (card_id, card_name, set_name, listing_price, listing_date, status,
         ebay_fee_rate, ebay_fee_fixed, sold_price, sold_date, shipping_cost, ebay_fees_total, net_profit)
       VALUES ($1,$2,$3,$4,$5,'sold',$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [card.id, card.name, card.set_name, sold_price, saleDate,
       feeRate, feeFixed, sold_price, saleDate, shipping_cost, feesTotal, netProfit]
    );

    const updated = await query(
      `UPDATE cards SET status='sold', sold_price=$1, sold_date=$2, ebay_listing_id=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [sold_price, saleDate, listing.rows[0].id, req.params.id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/cards/:id/restore — move sold card back to active collection
router.put('/:id/restore', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE cards SET status='active', sold_price=NULL, sold_date=NULL, ebay_listing_id=NULL, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Card not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cards/bulk
router.delete('/bulk', async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required' });
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await query(`DELETE FROM cards WHERE id IN (${placeholders}) RETURNING id`, ids);
    res.json({ deleted: result.rows.length });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cards/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM cards WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Card not found' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
