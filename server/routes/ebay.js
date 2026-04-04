const express = require('express');
const router = express.Router();
const { query } = require('../db');

function calcNetProfit(soldPrice, feeRate, feeFixed, shippingCost) {
  if (soldPrice == null) return null;
  const fees = soldPrice * feeRate + parseFloat(feeFixed);
  return soldPrice - fees - shippingCost;
}

// GET /api/ebay
router.get('/', async (req, res, next) => {
  try {
    const { status, card_id, sort = 'created_at', order = 'DESC' } = req.query;
    let conditions = [];
    let params = [];
    let i = 1;

    if (status) {
      conditions.push(`e.status = $${i++}`);
      params.push(status);
    }
    if (card_id) {
      conditions.push(`e.card_id = $${i++}`);
      params.push(card_id);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const allowedSorts = ['listing_date', 'sold_date', 'listing_price', 'sold_price', 'net_profit', 'created_at'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const result = await query(
      `SELECT e.*, c.name AS card_name, c.set_name, c.image_url, c.condition AS card_condition
       FROM ebay_listings e
       LEFT JOIN cards c ON c.id = e.card_id
       ${whereClause}
       ORDER BY e.${sortCol} ${sortDir}`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/ebay
router.post('/', async (req, res, next) => {
  try {
    const {
      card_id, listing_price, listing_date, status = 'active',
      listing_url, notes,
      ebay_fee_rate, ebay_fee_fixed
    } = req.body;

    if (!listing_price) return res.status(400).json({ error: 'Listing price is required' });

    // Get default fee settings if not provided
    let feeRate = ebay_fee_rate;
    let feeFixed = ebay_fee_fixed;
    if (feeRate == null || feeFixed == null) {
      const settings = await query(`SELECT key, value FROM settings WHERE key IN ('ebay_fee_rate', 'ebay_fee_fixed')`);
      const settingsMap = Object.fromEntries(settings.rows.map(r => [r.key, parseFloat(r.value)]));
      feeRate = feeRate ?? settingsMap.ebay_fee_rate ?? 0.1325;
      feeFixed = feeFixed ?? settingsMap.ebay_fee_fixed ?? 0.30;
    }

    const result = await query(
      `INSERT INTO ebay_listings
        (card_id, listing_price, listing_date, status, listing_url, notes, ebay_fee_rate, ebay_fee_fixed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [card_id || null, listing_price, listing_date || new Date(), status, listing_url, notes, feeRate, feeFixed]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/ebay/:id
router.put('/:id', async (req, res, next) => {
  try {
    const {
      card_id, listing_price, listing_date, status,
      listing_url, notes, ebay_fee_rate, ebay_fee_fixed
    } = req.body;

    const result = await query(
      `UPDATE ebay_listings SET
        card_id=$1, listing_price=$2, listing_date=$3, status=$4,
        listing_url=$5, notes=$6,
        ebay_fee_rate=COALESCE($7, ebay_fee_rate),
        ebay_fee_fixed=COALESCE($8, ebay_fee_fixed),
        updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [card_id || null, listing_price, listing_date, status,
       listing_url, notes, ebay_fee_rate, ebay_fee_fixed, req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Listing not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/ebay/:id/sold
router.put('/:id/sold', async (req, res, next) => {
  try {
    const { sold_price, sold_date, shipping_cost = 0, ebay_fee_rate, ebay_fee_fixed } = req.body;
    if (sold_price == null) return res.status(400).json({ error: 'sold_price is required' });

    const listing = await query('SELECT * FROM ebay_listings WHERE id=$1', [req.params.id]);
    if (!listing.rows.length) return res.status(404).json({ error: 'Listing not found' });

    const feeRate = ebay_fee_rate ?? listing.rows[0].ebay_fee_rate;
    const feeFixed = ebay_fee_fixed ?? listing.rows[0].ebay_fee_fixed;
    const feesTotal = sold_price * feeRate + parseFloat(feeFixed);
    const netProfit = sold_price - feesTotal - parseFloat(shipping_cost);

    const result = await query(
      `UPDATE ebay_listings SET
        status='sold', sold_price=$1, sold_date=$2, shipping_cost=$3,
        ebay_fee_rate=$4, ebay_fee_fixed=$5,
        ebay_fees_total=$6, net_profit=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [sold_price, sold_date || new Date(), shipping_cost, feeRate, feeFixed,
       feesTotal.toFixed(2), netProfit.toFixed(2), req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/ebay/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM ebay_listings WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Listing not found' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
