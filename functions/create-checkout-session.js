import { getStripe, priceIdFor } from './_stripe.js';
import { ALL_COUNTRIES } from './_countries.js';

const VALID_DISCOUNT_CODES = new Set(['GUIDEDEAL']);
const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
// The guide is a digital PDF (instant download) — only lithophane/frame are physically shipped.
const PHYSICAL_PRODUCTS = new Set(['lithophane', 'frame']);

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      return Response.json({ error: 'No items provided' }, { status: 400 });
    }

    const line_items = [];
    for (const item of items) {
      const price = priceIdFor(env, item.product);
      if (!price) {
        return Response.json({ error: `Unknown product: ${item.product}` }, { status: 400 });
      }
      line_items.push({ price, quantity: item.quantity && item.quantity > 0 ? item.quantity : 1 });
    }

    const origin = new URL(request.url).origin;
    const referer = request.headers.get('referer');
    const returnTo = referer ? new URL(referer).pathname : '/';
    const needsShipping = items.some(i => PHYSICAL_PRODUCTS.has(i.product));

    const params = {
      mode: 'payment',
      line_items,
      success_url: `${origin}${returnTo}?order=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnTo}?order=cancelled`,
      metadata: {
        photo_url: body.photoUrl || '',
        product_keys: items.map(i => i.product).join(','),
        order_summary: items.map(i => `${i.product} x${i.quantity || 1}`).join(', ')
      }
    };

    if (needsShipping) {
      params.shipping_address_collection = { allowed_countries: ALL_COUNTRIES };
      params.phone_number_collection = { enabled: true };
      // Shipping cost is picked once, up front, based on the customer's IP-detected
      // country — Stripe Checkout has no way to switch the rate after the customer
      // types their actual address, so this is a best-effort match, same tradeoff
      // the old Shopify integration made for currency display.
      const country = request.headers.get('cf-ipcountry') || 'GB';
      const shippingRate = country === 'GB' ? env.STRIPE_SHIPPING_RATE_UK : env.STRIPE_SHIPPING_RATE_INTL;
      if (shippingRate) {
        params.shipping_options = [{ shipping_rate: shippingRate }];
      }
    }

    if (body.attribution && typeof body.attribution === 'object') {
      for (const key of ATTRIBUTION_KEYS) {
        if (body.attribution[key]) params.metadata[key] = String(body.attribution[key]).slice(0, 500);
      }
    }

    if (body.discountCode && VALID_DISCOUNT_CODES.has(body.discountCode.toUpperCase())) {
      params.discounts = [{ coupon: body.discountCode.toUpperCase() }];
    } else {
      params.allow_promotion_codes = true;
    }

    const stripe = getStripe(env);
    const session = await stripe.checkout.sessions.create(params);

    return Response.json({ url: session.url });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
