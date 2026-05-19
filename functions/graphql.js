export async function onRequestPost({ request, env }) {
  try {
    const country = request.headers.get('CF-IPCountry') || 'GB';
    const body = await request.text();

    // Inject @inContext(country: XX) so Shopify returns local currency
    const parsed = JSON.parse(body);
    let q = parsed.query.trim();
    if (q.startsWith('{')) {
      q = `query @inContext(country: ${country}) ${q}`;
    } else {
      q = q.replace('{', `@inContext(country: ${country}) {`);
    }
    parsed.query = q;

    const response = await fetch('https://oh-bees-city.myshopify.com/api/2026-01/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': env.SHOPIFY_TOKEN
      },
      body: JSON.stringify(parsed)
    });

    const data = await response.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
