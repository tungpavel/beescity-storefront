import Stripe from 'stripe';

export function getStripe(env) {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: '2025-01-27.acacia'
  });
}

export const PRODUCT_KEYS = ['lithophane', 'frame', 'guide'];

export function priceIdFor(env, productKey) {
  const map = {
    lithophane: env.STRIPE_PRICE_LITHOPHANE,
    frame: env.STRIPE_PRICE_FRAME,
    guide: env.STRIPE_PRICE_GUIDE
  };
  return map[productKey];
}
