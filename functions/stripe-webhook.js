import { getStripe } from './_stripe.js';
import { upsertOrder } from './_supabase.js';

const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

async function sendEmail(env, { to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: `Oh Bees City <orders@beescity.co.uk>`,
      to,
      subject,
      html
    })
  });
  if (!res.ok) {
    console.error('[RESEND] send failed', res.status, await res.text());
  }
}

function formatAddress(addr) {
  if (!addr) return 'Not provided';
  return [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
    .filter(Boolean).join(', ');
}

function customerEmailHtml(session, itemsList, hasGuide, guideDownloadUrl) {
  const needsShipping = !!session.shipping_details;
  const address = formatAddress(session.shipping_details?.address ?? session.customer_details?.address);
  return `
    <h2>Thanks for your order!</h2>
    <p>We've received your payment${needsShipping ? ' and are getting your order ready' : ''}.</p>
    <p><strong>Order summary:</strong> ${itemsList}</p>
    ${needsShipping ? `<p><strong>Shipping to:</strong><br>${session.shipping_details?.name ?? session.customer_details?.name ?? ''}<br>${address}</p>
    <p>If any of these details are wrong, reply to this email as soon as possible and we'll fix it before we ship.</p>` : ''}
    ${hasGuide && guideDownloadUrl ? `<p><strong>Your Lithophane Master Guide:</strong> <a href="${guideDownloadUrl}">Download the PDF here</a></p>` : ''}
    <p>— Oh Bees City</p>
  `;
}

function ownerEmailHtml(session, itemsList, photoUrl) {
  const needsShipping = !!session.shipping_details;
  const address = formatAddress(session.shipping_details?.address ?? session.customer_details?.address);
  return `
    <h2>New order</h2>
    <p><strong>Items:</strong> ${itemsList}</p>
    <p><strong>Amount:</strong> ${(session.amount_total / 100).toFixed(2)} ${session.currency.toUpperCase()}</p>
    <p><strong>Customer:</strong> ${session.customer_details?.name ?? ''} — ${session.customer_details?.email ?? ''} — ${session.customer_details?.phone ?? ''}</p>
    <p><strong>Shipping address:</strong><br>${needsShipping ? address : 'Digital delivery only — no shipping required'}</p>
    ${photoUrl ? `<p><strong>Photo:</strong> <a href="${photoUrl}">${photoUrl}</a></p>` : ''}
    <p><strong>Stripe session:</strong> ${session.id}</p>
  `;
}

export async function onRequestPost({ request, env }) {
  const stripe = getStripe(env);
  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[STRIPE] signature verification failed', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const sessionSummary = event.data.object;
    const session = await stripe.checkout.sessions.retrieve(sessionSummary.id, {
      expand: ['line_items', 'customer_details']
    });

    const itemsList = session.line_items.data
      .map(li => `${li.description} x${li.quantity}`)
      .join(', ') || session.metadata?.order_summary || '';
    const photoUrl = session.metadata?.photo_url || null;
    const productKeys = (session.metadata?.product_keys || '').split(',').filter(Boolean);
    const hasGuide = productKeys.includes('guide');
    const address = session.shipping_details?.address ?? session.customer_details?.address ?? null;
    const attribution = Object.fromEntries(
      ATTRIBUTION_KEYS.filter(k => session.metadata?.[k]).map(k => [k, session.metadata[k]])
    );

    await upsertOrder(env, {
      stripe_session_id: session.id,
      customer_email: session.customer_details?.email ?? null,
      customer_name: session.customer_details?.name ?? session.shipping_details?.name ?? null,
      shipping_address: address,
      phone: session.customer_details?.phone ?? null,
      line_items: session.line_items.data.map(li => ({
        description: li.description, quantity: li.quantity, amount_total: li.amount_total
      })),
      amount_total: session.amount_total,
      currency: session.currency,
      photo_url: photoUrl,
      attribution,
      status: 'paid'
    });

    if (session.customer_details?.email) {
      await sendEmail(env, {
        to: session.customer_details.email,
        subject: 'Your Oh Bees City order is confirmed',
        html: customerEmailHtml(session, itemsList, hasGuide, env.GUIDE_DOWNLOAD_URL)
      });
    }

    await sendEmail(env, {
      to: env.STORE_OWNER_EMAIL,
      subject: `New order — ${itemsList}`,
      html: ownerEmailHtml(session, itemsList, photoUrl)
    });
  }

  return Response.json({ received: true });
}
