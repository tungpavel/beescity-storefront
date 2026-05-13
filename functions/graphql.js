export async function onRequestPost({ request, env }) {
  try {
    const country = request.headers.get('CF-IPCountry') || 'GB';
    const body = await request.text();

    // Inject @inContext(country: XX) into the query so Shopify returns local currency
    const localised = body.replace(
      /"\s*query\s*(\{|[A-Za-z])/,
      (match) => match.replace('query', `query @inContext(country: ${country})`)
    ).replace(
      /"\s*mutation\s*(\{|[A-Za-z])/,
      (match) => match.replace('mutation', `mutation @inContext(country: ${country})`)
    );

    const response = await fetch('https://oh-bees-city.myshopify.com/api/2026-01/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': env.SHOPIFY_TOKEN
      },
      body: localised
    });

    const data = await response.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
