const express = require('express');
const router = express.Router();
const axios = require('axios');

const POKEMON_TCG_BASE = 'https://api.pokemontcg.io/v2';

function getApiHeaders() {
  const key = process.env.POKEMON_TCG_API_KEY;
  return key ? { 'X-Api-Key': key } : {};
}

function extractMarketPrice(tcgData) {
  const prices = tcgData?.tcgplayer?.prices;
  if (!prices) return null;

  // Priority order for price types
  const priceTypes = ['holofoil', 'reverseHolofoil', 'normal', '1stEditionHolofoil', '1stEditionNormal', 'unlimitedHolofoil'];
  for (const type of priceTypes) {
    if (prices[type]?.market) return prices[type].market;
  }
  // Fallback: first available market price
  for (const type of Object.keys(prices)) {
    if (prices[type]?.market) return prices[type].market;
  }
  return null;
}

async function fetchCardPrice(pokemonTcgId) {
  try {
    const res = await axios.get(`${POKEMON_TCG_BASE}/cards/${pokemonTcgId}`, {
      headers: getApiHeaders(),
      timeout: 10000,
    });
    const card = res.data?.data;
    if (!card) return null;
    return {
      market_price: extractMarketPrice(card),
      image_url: card.images?.large || card.images?.small || null,
    };
  } catch (err) {
    console.error('Pokemon TCG API error:', err.message);
    return null;
  }
}

// GET /api/pokemon/search?q=charizard&set=base1
router.get('/search', async (req, res, next) => {
  try {
    const { q, set, number, page = 1, pageSize = 12 } = req.query;

    let queryParts = [];
    if (q) queryParts.push(`name:"${q}*"`);
    if (set) queryParts.push(`set.id:"${set}"`);
    if (number) queryParts.push(`number:${number}`);

    const searchQ = queryParts.join(' ') || `name:"${q || 'Pikachu'}*"`;

    const response = await axios.get(`${POKEMON_TCG_BASE}/cards`, {
      headers: getApiHeaders(),
      params: {
        q: searchQ,
        page,
        pageSize,
        select: 'id,name,set,number,images,tcgplayer,cardmarket',
      },
      timeout: 15000,
    });

    const cards = (response.data?.data || []).map(card => ({
      id: card.id,
      name: card.name,
      set_name: card.set?.name,
      set_id: card.set?.id,
      card_number: card.number,
      image_url: card.images?.large || card.images?.small,
      market_price: extractMarketPrice(card),
    }));

    res.json({
      cards,
      totalCount: response.data?.totalCount || 0,
      page: response.data?.page || 1,
    });
  } catch (err) {
    if (err.response?.status === 402 || err.response?.status === 429) {
      return res.status(429).json({ error: 'Pokemon TCG API rate limit reached. Add an API key for higher limits.' });
    }
    next(err);
  }
});

// GET /api/pokemon/sets
router.get('/sets', async (req, res, next) => {
  try {
    const response = await axios.get(`${POKEMON_TCG_BASE}/sets`, {
      headers: getApiHeaders(),
      params: { orderBy: '-releaseDate', select: 'id,name,series,releaseDate' },
      timeout: 15000,
    });
    res.json(response.data?.data || []);
  } catch (err) {
    next(err);
  }
});

// GET /api/pokemon/card/:id
router.get('/card/:id', async (req, res, next) => {
  try {
    const data = await fetchCardPrice(req.params.id);
    if (!data) return res.status(404).json({ error: 'Card not found or price unavailable' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.fetchCardPrice = fetchCardPrice;
