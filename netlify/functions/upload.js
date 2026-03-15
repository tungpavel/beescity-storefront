const CLOUDFLARE_UPLOAD = 'https://shopify-uploads.tungthanht685.workers.dev';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : event.body;

    const response = await fetch(CLOUDFLARE_UPLOAD, {
      method: 'POST',
      headers: { 'content-type': event.headers['content-type'] },
      body
    });

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
