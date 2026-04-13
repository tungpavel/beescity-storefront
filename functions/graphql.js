export async function onRequestPost({ request, env }) {
  try {
    const response = await fetch('https://oh-bees-city.myshopify.com/api/2026-01/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': env.SHOPIFY_TOKEN
      },
      body: await request.text()
    });

    const data = await response.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
