const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/wishlist
router.get('/', async (req, res, next) => {
  try {
    const { search, sort = 'created_at', order = 'DESC' } = req.query;
    let conditions = [];
    let params = [];
    let i = 1;

    if (search) {
      conditions.push(`(name ILIKE $${i} OR set_name ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const allowedSorts = ['name', 'set_name', 'target_price', 'market_price', 'priority', 'created_at'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const result = await query(
      `SELECT * FROM wishlist ${whereClause} ORDER BY ${sortCol} ${sortDir}`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/wishlist
router.post('/', async (req, res, next) => {
  try {
    const { name, set_name, card_number, condition, quantity = 1, target_price, market_price, image_url, notes, priority = 'medium' } = req.body;
    if (!name) return res.status(400).json({ error: 'Card name is required' });

    const result = await query(
      `INSERT INTO wishlist (name, set_name, card_number, condition, quantity, target_price, market_price, image_url, notes, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, set_name || null, card_number || null, condition || null, quantity,
       target_price || null, market_price || null, image_url || null, notes || null, priority]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/wishlist/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, set_name, card_number, condition, quantity, target_price, market_price, image_url, notes, priority } = req.body;

    const result = await query(
      `UPDATE wishlist SET
        name=$1, set_name=$2, card_number=$3, condition=$4, quantity=$5,
        target_price=$6, market_price=$7, image_url=$8, notes=$9, priority=$10,
        updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [name, set_name || null, card_number || null, condition || null, quantity,
       target_price || null, market_price || null, image_url || null, notes || null,
       priority || 'medium', req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/wishlist/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM wishlist WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/wishlist/:id/purchase — moves item to collection
router.post('/:id/purchase', async (req, res, next) => {
  try {
    const { purchase_price, purchase_date, condition } = req.body;

    const wishResult = await query('SELECT * FROM wishlist WHERE id=$1', [req.params.id]);
    if (!wishResult.rows.length) return res.status(404).json({ error: 'Item not found' });

    const item = wishResult.rows[0];

    const cardResult = await query(
      `INSERT INTO cards (name, set_name, card_number, condition, quantity, purchase_price, purchase_date, market_price, image_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        item.name,
        item.set_name,
        item.card_number,
        condition || item.condition,
        item.quantity,
        purchase_price || null,
        purchase_date || null,
        item.market_price,
        item.image_url,
        item.notes,
      ]
    );

    await query('DELETE FROM wishlist WHERE id=$1', [req.params.id]);

    res.status(201).json(cardResult.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
