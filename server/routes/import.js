const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { query } = require('../db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function streamToRows(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = Readable.from(buffer.toString());
    stream
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// POST /api/import/cards
router.post('/cards', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const rows = await streamToRows(req.file.buffer);
    if (!rows.length) return res.status(400).json({ error: 'CSV file is empty' });

    const results = { imported: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const name = (row.name || row.Name || '').trim();
        if (!name) {
          results.errors.push({ row: i + 2, error: 'Missing card name' });
          continue;
        }

        await query(
          `INSERT INTO cards
            (name, set_name, card_number, condition, quantity, purchase_price,
             purchase_date, notes, pokemon_tcg_id, market_price, image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            name,
            row.set_name || row['Set Name'] || row.set || null,
            row.card_number || row['Card Number'] || row.number || null,
            row.condition || row.Condition || null,
            parseInt(row.quantity || row.Quantity || '1') || 1,
            parseFloat(row.purchase_price || row['Purchase Price'] || '') || null,
            row.purchase_date || row['Purchase Date'] || null,
            row.notes || row.Notes || null,
            row.pokemon_tcg_id || row['Pokemon TCG ID'] || null,
            parseFloat(row.market_price || row['Market Price'] || '') || null,
            row.image_url || row['Image URL'] || null,
          ]
        );
        results.imported++;
      } catch (err) {
        results.errors.push({ row: i + 2, error: err.message });
      }
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// POST /api/import/ebay-orders — imports Pokémon sales from an eBay orders CSV export
router.post('/ebay-orders', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // eBay CSV has a blank first row before the headers — skip it
    const lines = req.file.buffer.toString().split('\n');
    const withoutBlankFirst = lines.slice(1).join('\n');

    const rows = await streamToRows(Buffer.from(withoutBlankFirst));

    const POKEMON_RE = /pokemon|pokémon|\bGX\b|\bEX\b|\bVMAX\b|\bVSTAR\b/i;

    function parseEbayDate(str) {
      if (!str || !str.trim()) return null;
      const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
      const [mon, day, yr] = str.trim().split('-');
      if (!mon || !day || !yr) return null;
      const month = months[mon];
      if (month === undefined) return null;
      return new Date(2000 + parseInt(yr), month, parseInt(day)).toISOString().split('T')[0];
    }

    function parsePrice(str) {
      if (!str) return null;
      const num = parseFloat(str.replace(/[$,]/g, ''));
      return isNaN(num) ? null : num;
    }

    const FEE_RATE = 0.1325;
    const FEE_FIXED = 0.30;

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const title = (row['Item Title'] || '').trim();
      if (!title || !POKEMON_RE.test(title)) { skipped++; continue; }

      const soldPrice = parsePrice(row['Sold For']);
      if (!soldPrice) { skipped++; continue; }

      const saleDate = parseEbayDate(row['Sale Date']);
      const itemNumber = (row['Item Number'] || '').trim();
      const listingUrl = itemNumber ? `https://www.ebay.com/itm/${itemNumber}` : null;
      const feesTotal = Math.round((soldPrice * FEE_RATE + FEE_FIXED) * 100) / 100;
      const netProfit = Math.round((soldPrice - feesTotal) * 100) / 100;

      await query(
        `INSERT INTO ebay_listings
          (card_name, listing_price, listing_date, status, sold_price, sold_date,
           ebay_fee_rate, ebay_fee_fixed, ebay_fees_total, shipping_cost,
           net_profit, listing_url)
         VALUES ($1,$2,$3,'sold',$4,$5,$6,$7,$8,0,$9,$10)`,
        [title, soldPrice, saleDate, soldPrice, saleDate,
         FEE_RATE, FEE_FIXED, feesTotal, netProfit, listingUrl]
      );
      imported++;
    }

    res.json({ imported, skipped });
  } catch (err) {
    next(err);
  }
});

// GET /api/export/cards
router.get('/cards', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, set_name, card_number, condition, quantity,
        purchase_price, purchase_date, market_price, notes, pokemon_tcg_id, image_url, created_at
       FROM cards ORDER BY name`
    );

    const headers = [
      'id', 'name', 'set_name', 'card_number', 'condition', 'quantity',
      'purchase_price', 'purchase_date', 'market_price', 'notes', 'pokemon_tcg_id', 'image_url', 'created_at'
    ];

    const csvLines = [
      headers.join(','),
      ...result.rows.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val == null) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
      )
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pokemon_collection.csv"');
    res.send(csvLines.join('\n'));
  } catch (err) {
    next(err);
  }
});

// GET /api/export/ebay
router.get('/ebay', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT e.id, c.name AS card_name, c.set_name, e.listing_price, e.listing_date,
        e.status, e.sold_price, e.sold_date, e.ebay_fee_rate, e.ebay_fees_total,
        e.shipping_cost, e.net_profit, e.listing_url, e.notes
       FROM ebay_listings e
       LEFT JOIN cards c ON c.id = e.card_id
       ORDER BY e.listing_date DESC`
    );

    const headers = [
      'id', 'card_name', 'set_name', 'listing_price', 'listing_date', 'status',
      'sold_price', 'sold_date', 'ebay_fee_rate', 'ebay_fees_total',
      'shipping_cost', 'net_profit', 'listing_url', 'notes'
    ];

    const csvLines = [
      headers.join(','),
      ...result.rows.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val == null) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
      )
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ebay_sales.csv"');
    res.send(csvLines.join('\n'));
  } catch (err) {
    next(err);
  }
});

// GET /api/export/ebay-sold — sold listings only
router.get('/ebay-sold', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT e.id,
        COALESCE(e.card_name, c.name) AS card_name,
        COALESCE(e.set_name, c.set_name) AS set_name,
        e.listing_price, e.listing_date, e.sold_price, e.sold_date,
        e.ebay_fee_rate, e.ebay_fees_total, e.shipping_cost, e.net_profit,
        e.listing_url, e.notes
      FROM ebay_listings e
      LEFT JOIN cards c ON c.id = e.card_id
      WHERE e.status = 'sold'
      ORDER BY e.sold_date DESC
    `);

    const headers = [
      'id', 'card_name', 'set_name', 'listing_price', 'listing_date',
      'sold_price', 'sold_date', 'ebay_fee_rate', 'ebay_fees_total',
      'shipping_cost', 'net_profit', 'listing_url', 'notes'
    ];

    const csvLines = [
      headers.join(','),
      ...result.rows.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val == null) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
      )
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ebay_sold.csv"');
    res.send(csvLines.join('\n'));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
