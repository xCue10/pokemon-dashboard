require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const migrate = require('./db/migrate');

const cardsRouter = require('./routes/cards');
const ebayRouter = require('./routes/ebay');
const dashboardRouter = require('./routes/dashboard');
const sealedRouter = require('./routes/sealed');
const wishlistRouter = require('./routes/wishlist');
const importRouter = require('./routes/import');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({ origin: isProd ? false : ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/cards', cardsRouter);
app.use('/api/ebay', ebayRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/sealed', sealedRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/import', importRouter);
app.use('/api/export', importRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React build in production
if (isProd) {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

async function start() {
  try {
    await migrate();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
