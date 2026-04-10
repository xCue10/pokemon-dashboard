const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/sold — all sold cards and sealed products combined
router.get('/', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        c.id, c.name, c.set_name, c.card_number, c.condition, c.image_url,
        c.purchase_price, c.sold_price, c.sold_date, c.ebay_listing_id,
        'card' AS source,
        e.ebay_fees_total, e.shipping_cost, e.net_profit, e.listing_url
      FROM cards c
      LEFT JOIN ebay_listings e ON e.id = c.ebay_listing_id
      WHERE c.status = 'sold'

      UNION ALL

      SELECT
        sp.id, sp.name, sp.set_name, sp.product_type AS card_number, NULL AS condition, sp.image_url,
        sp.purchase_price, sp.sold_price, sp.sold_date, sp.ebay_listing_id,
        'sealed' AS source,
        e.ebay_fees_total, e.shipping_cost, e.net_profit, e.listing_url
      FROM sealed_products sp
      LEFT JOIN ebay_listings e ON e.id = sp.ebay_listing_id
      WHERE sp.status = 'sold'

      ORDER BY sold_date DESC NULLS LAST, id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
