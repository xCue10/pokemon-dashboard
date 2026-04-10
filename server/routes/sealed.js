const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/sealed
router.get('/', async (req, res, next) => {
  try {
    const { sort = 'created_at', order = 'DESC', search, set } = req.query;
    let conditions = [];
    let params = [];
    let i = 1;

    if (search) {
      conditions.push(`(name ILIKE $${i} OR set_name ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }
    if (set) {
      conditions.push(`set_name ILIKE $${i++}`);
      params.push(`%${set}%`);
    }

    conditions.unshift(`COALESCE(status, 'active') = 'active'`);
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const allowedSorts = ['name', 'set_name', 'product_type', 'purchase_price', 'market_price', 'purchase_date', 'created_at', 'quantity', 'total_market_value', 'unrealized_profit', 'roi_pct'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const result = await query(
      `SELECT *,
        COALESCE(market_price, 0) * quantity AS total_market_value,
        COALESCE(purchase_price, 0) * quantity AS total_purchase_value,
        (COALESCE(market_price, 0) - COALESCE(purchase_price, 0)) * quantity AS unrealized_profit,
        CASE WHEN COALESCE(purchase_price, 0) > 0
          THEN ((COALESCE(market_price, 0) - COALESCE(purchase_price, 0)) / purchase_price * 100)
          ELSE 0 END AS roi_pct
       FROM sealed_products
       ${whereClause}
       ORDER BY ${sortCol} ${sortDir}`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/sealed/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM sealed_products WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/sealed
router.post('/', async (req, res, next) => {
  try {
    const { name, product_type, set_name, quantity = 1, purchase_price, purchase_date, market_price, image_url, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name is required' });

    const result = await query(
      `INSERT INTO sealed_products (name, product_type, set_name, quantity, purchase_price, purchase_date, market_price, image_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, product_type || null, set_name || null, quantity, purchase_price || null,
       purchase_date || null, market_price || null, image_url || null, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/sealed/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, product_type, set_name, quantity, purchase_price, purchase_date, market_price, image_url, notes } = req.body;

    const result = await query(
      `UPDATE sealed_products SET
        name=$1, product_type=$2, set_name=$3, quantity=$4,
        purchase_price=$5, purchase_date=$6, market_price=$7,
        image_url=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, product_type || null, set_name || null, quantity,
       purchase_price || null, purchase_date || null, market_price || null,
       image_url || null, notes || null, req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/sealed/:id/sell
router.put('/:id/sell', async (req, res, next) => {
  try {
    const { sold_price, sold_date, shipping_cost = 0, ebay_fee_rate, ebay_fee_fixed } = req.body;
    if (!sold_price) return res.status(400).json({ error: 'sold_price is required' });

    const prodResult = await query('SELECT * FROM sealed_products WHERE id=$1', [req.params.id]);
    if (!prodResult.rows.length) return res.status(404).json({ error: 'Product not found' });
    const prod = prodResult.rows[0];

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
        (card_name, set_name, listing_price, listing_date, status,
         ebay_fee_rate, ebay_fee_fixed, sold_price, sold_date, shipping_cost, ebay_fees_total, net_profit)
       VALUES ($1,$2,$3,$4,'sold',$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [prod.name, prod.set_name, sold_price, saleDate,
       feeRate, feeFixed, sold_price, saleDate, shipping_cost, feesTotal, netProfit]
    );

    const updated = await query(
      `UPDATE sealed_products SET status='sold', sold_price=$1, sold_date=$2, ebay_listing_id=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [sold_price, saleDate, listing.rows[0].id, req.params.id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/sealed/:id/restore
router.put('/:id/restore', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE sealed_products SET status='active', sold_price=NULL, sold_date=NULL, ebay_listing_id=NULL, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sealed/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM sealed_products WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
