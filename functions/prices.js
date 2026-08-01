import { getStripe, PRODUCT_KEYS, priceIdFor } from './_stripe.js';

const BUNDLE_COUPON_ID = 'GUIDEDEAL';

export async function onRequestGet({ env }) {
  try {
    const stripe = getStripe(env);

    const entries = await Promise.all(PRODUCT_KEYS.map(async key => {
      const priceId = priceIdFor(env, key);
      if (!priceId) return [key, null];

      const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
      const product = price.product;
      const compareAt = Number(product.metadata?.compare_at_amount) || null;

      return [key, {
        amount: price.unit_amount / 100,
        currency: price.currency.toUpperCase(),
        compareAtAmount: compareAt,
        active: price.active && product.active
      }];
    }));

    const result = Object.fromEntries(entries);

    // Bundle discount preview: apply the GUIDEDEAL coupon to the guide's price server-side
    // so pages can show the discounted "add the guide" price without creating a real order.
    if (result.guide) {
      try {
        const coupon = await stripe.coupons.retrieve(BUNDLE_COUPON_ID);
        const guidePence = result.guide.amount * 100;
        let discountedPence = guidePence;
        if (coupon.percent_off) discountedPence = guidePence * (1 - coupon.percent_off / 100);
        else if (coupon.amount_off) discountedPence = guidePence - coupon.amount_off;
        result.guide.bundlePrice = Math.max(0, discountedPence) / 100;
      } catch (err) {
        console.error('[PRICES] coupon lookup failed', err.message);
      }
    }

    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
