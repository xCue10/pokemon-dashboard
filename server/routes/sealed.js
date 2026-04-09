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

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const allowedSorts = ['name', 'set_name', 'product_type', 'purchase_price', 'market_price', 'purchase_date', 'created_at', 'quantity'];
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
