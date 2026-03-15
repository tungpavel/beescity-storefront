const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const STOREFRONT_TOKEN  = process.env.SHOPIFY_TOKEN;
const SHOPIFY_URL       = 'https://oh-bees-city.myshopify.com/api/2026-01/graphql.json';
const CLOUDFLARE_UPLOAD = 'https://shopify-uploads.tungthanht685.workers.dev';

// /upload must be registered BEFORE express.json() so the stream isn't consumed
app.post('/upload', (req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', async () => {
    try {
      const body = Buffer.concat(chunks);
      console.log('[UPLOAD] forwarding', body.length, 'bytes to Cloudflare');

      const response = await fetch(CLOUDFLARE_UPLOAD, {
        method: 'POST',
        headers: { 'content-type': req.headers['content-type'] },
        body
      });

      console.log('[UPLOAD] Cloudflare responded', response.status);
      const text = await response.text();
      console.log('[UPLOAD] Cloudflare body:', text);

      res.setHeader('Content-Type', 'application/json');
      res.send(text);
    } catch (err) {
      console.error('[UPLOAD] error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });
  req.on('error', err => {
    console.error('[UPLOAD] stream error:', err.message);
    res.status(500).json({ error: err.message });
  });
});

app.use(express.json());
app.use(express.static('.'));

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
