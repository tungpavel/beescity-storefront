const CLOUDFLARE_UPLOAD = 'https://shopify-uploads.tungthanht685.workers.dev';

export async function onRequestPost({ request }) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const body = await request.arrayBuffer();

    const response = await fetch(CLOUDFLARE_UPLOAD, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body
    });

    const data = await response.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
