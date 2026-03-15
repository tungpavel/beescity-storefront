const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const STOREFRONT_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_URL = 'https://oh-bees-city.myshopify.com/api/2026-01/graphql.json';

app.post('/graphql', async (req, res) => {
  try {
    const response = await fetch(SHOPIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
