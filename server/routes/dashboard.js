const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [collectionStats, ebayStats, bestWorst, recentSales] = await Promise.all([
      // Collection totals (cards + sealed products combined)
      query(`
        SELECT
          COUNT(*) AS total_cards,
          SUM(quantity) AS total_quantity,
          COALESCE(SUM(purchase_price * quantity), 0) AS total_invested,
          COALESCE(SUM(market_price * quantity), 0) AS total_market_value,
          COALESCE(SUM((market_price - purchase_price) * quantity), 0) AS unrealized_profit
        FROM (
          SELECT quantity, purchase_price, market_price FROM cards
          UNION ALL
          SELECT quantity, purchase_price, market_price FROM sealed_products
        ) AS combined
      `),
      // eBay totals
      query(`
        SELECT
          COUNT(*) FILTER (WHERE status='active') AS active_listings,
          COUNT(*) FILTER (WHERE status='sold') AS total_sold,
          COALESCE(SUM(net_profit) FILTER (WHERE status='sold'), 0) AS total_realized_profit,
          COALESCE(SUM(ebay_fees_total) FILTER (WHERE status='sold'), 0) AS total_fees
        FROM ebay_listings
      `),
      // Best and worst performing cards by ROI
      query(`
        SELECT id, name, set_name, image_url, purchase_price, market_price, quantity,
          CASE WHEN purchase_price > 0
            THEN ROUND(((market_price - purchase_price) / purchase_price * 100)::numeric, 2)
            ELSE 0 END AS roi_pct,
          (market_price - purchase_price) * quantity AS profit
        FROM cards
        WHERE purchase_price > 0 AND market_price IS NOT NULL
        ORDER BY roi_pct DESC
        LIMIT 5
      `),
      // Recent sales
      query(`
        SELECT e.*, c.name AS card_name, c.image_url, c.set_name
        FROM ebay_listings e
        LEFT JOIN cards c ON c.id = e.card_id
        WHERE e.status = 'sold'
        ORDER BY e.sold_date DESC
        LIMIT 5
      `),
    ]);

    // Worst performers (separate query)
    const worstResult = await query(`
      SELECT id, name, set_name, image_url, purchase_price, market_price, quantity,
        CASE WHEN purchase_price > 0
          THEN ROUND(((market_price - purchase_price) / purchase_price * 100)::numeric, 2)
          ELSE 0 END AS roi_pct,
        (market_price - purchase_price) * quantity AS profit
      FROM cards
      WHERE purchase_price > 0 AND market_price IS NOT NULL
      ORDER BY roi_pct ASC
      LIMIT 5
    `);

    const stats = collectionStats.rows[0];
    const ebay = ebayStats.rows[0];
    const totalInvested = parseFloat(stats.total_invested);
    const totalMarket = parseFloat(stats.total_market_value);
    const unrealizedROI = totalInvested > 0 ? ((totalMarket - totalInvested) / totalInvested * 100).toFixed(2) : 0;

    res.json({
      collection: {
        total_cards: parseInt(stats.total_cards),
        total_quantity: parseInt(stats.total_quantity),
        total_invested: totalInvested,
        total_market_value: totalMarket,
        unrealized_profit: parseFloat(stats.unrealized_profit),
        unrealized_roi_pct: parseFloat(unrealizedROI),
      },
      ebay: {
        active_listings: parseInt(ebay.active_listings),
        total_sold: parseInt(ebay.total_sold),
        total_realized_profit: parseFloat(ebay.total_realized_profit),
        total_fees: parseFloat(ebay.total_fees),
      },
      best_performers: bestWorst.rows,
      worst_performers: worstResult.rows,
      recent_sales: recentSales.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/charts
router.get('/charts', async (req, res, next) => {
  try {
    const [bySet, priceComparison, monthlySales] = await Promise.all([
      // Portfolio value by category
      query(`
        SELECT category,
          ROUND(SUM(market_price * quantity)::numeric, 2) AS market_value,
          ROUND(SUM(purchase_price * quantity)::numeric, 2) AS invested
        FROM (
          SELECT
            CASE
              WHEN condition ILIKE 'PSA%' OR condition ILIKE 'BGS%' OR condition ILIKE 'CGC%'
                THEN 'Singles (Graded)'
              ELSE 'Singles (Raw)'
            END AS category,
            market_price, purchase_price, quantity
          FROM cards
          UNION ALL
          SELECT 'Sealed' AS category, market_price, purchase_price, quantity
          FROM sealed_products
        ) AS combined
        GROUP BY category
        ORDER BY category
      `),
      // Purchase price vs market price per card (top 20 by market value)
      query(`
        SELECT name, set_name,
          ROUND(purchase_price::numeric, 2) AS purchase_price,
          ROUND(market_price::numeric, 2) AS market_price,
          quantity
        FROM cards
        WHERE purchase_price IS NOT NULL AND market_price IS NOT NULL
        ORDER BY market_price * quantity DESC
        LIMIT 20
      `),
      // Monthly sales profit (last 12 months)
      query(`
        SELECT
          TO_CHAR(sold_date, 'YYYY-MM') AS month,
          ROUND(SUM(net_profit)::numeric, 2) AS profit,
          COUNT(*) AS sales_count,
          ROUND(SUM(sold_price)::numeric, 2) AS revenue
        FROM ebay_listings
        WHERE status = 'sold'
          AND sold_date >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month ASC
      `),
    ]);

    res.json({
      portfolio_by_set: bySet.rows,
      price_comparison: priceComparison.rows,
      monthly_sales: monthlySales.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/settings
router.get('/settings', async (req, res, next) => {
  try {
    const result = await query('SELECT key, value FROM settings');
    const settings = Object.fromEntries(result.rows.map(r => [r.key, r.value]));
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// PUT /api/dashboard/settings
router.put('/settings', async (req, res, next) => {
  try {
    const { ebay_fee_rate, ebay_fee_fixed } = req.body;
    const updates = [];
    if (ebay_fee_rate !== undefined) updates.push(['ebay_fee_rate', String(ebay_fee_rate)]);
    if (ebay_fee_fixed !== undefined) updates.push(['ebay_fee_fixed', String(ebay_fee_fixed)]);

    for (const [key, value] of updates) {
      await query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, value]
      );
    }

    const result = await query('SELECT key, value FROM settings');
    res.json(Object.fromEntries(result.rows.map(r => [r.key, r.value])));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
