const { query } = require('./index');

async function migrate() {
  console.log('Running database migrations...');

  await query(`
    CREATE TABLE IF NOT EXISTS cards (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      set_name VARCHAR(255),
      card_number VARCHAR(50),
      condition VARCHAR(50),
      quantity INTEGER DEFAULT 1,
      purchase_price DECIMAL(10,2),
      purchase_date DATE,
      notes TEXT,
      pokemon_tcg_id VARCHAR(100),
      market_price DECIMAL(10,2),
      image_url TEXT,
      set_id VARCHAR(100),
      last_price_update TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Add card_name column to ebay_listings if it doesn't exist yet
  await query(`
    ALTER TABLE ebay_listings ADD COLUMN IF NOT EXISTS card_name VARCHAR(255)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ebay_listings (
      id SERIAL PRIMARY KEY,
      card_id INTEGER REFERENCES cards(id) ON DELETE SET NULL,
      listing_price DECIMAL(10,2) NOT NULL,
      listing_date DATE,
      status VARCHAR(20) DEFAULT 'active',
      sold_price DECIMAL(10,2),
      sold_date DATE,
      ebay_fee_rate DECIMAL(6,4) DEFAULT 0.1325,
      ebay_fee_fixed DECIMAL(10,2) DEFAULT 0.30,
      ebay_fees_total DECIMAL(10,2),
      shipping_cost DECIMAL(10,2) DEFAULT 0,
      net_profit DECIMAL(10,2),
      listing_url TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sealed_products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      product_type VARCHAR(100),
      set_name VARCHAR(255),
      quantity INTEGER DEFAULT 1,
      purchase_price DECIMAL(10,2),
      purchase_date DATE,
      market_price DECIMAL(10,2),
      image_url TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      set_name VARCHAR(255),
      card_number VARCHAR(50),
      condition VARCHAR(50),
      quantity INTEGER DEFAULT 1,
      target_price DECIMAL(10,2),
      market_price DECIMAL(10,2),
      image_url TEXT,
      notes TEXT,
      priority VARCHAR(10) DEFAULT 'medium',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Default settings
  await query(`
    INSERT INTO settings (key, value) VALUES
      ('ebay_fee_rate', '0.1325'),
      ('ebay_fee_fixed', '0.30')
    ON CONFLICT (key) DO NOTHING
  `);

  console.log('Migrations complete.');
}

module.exports = migrate;
