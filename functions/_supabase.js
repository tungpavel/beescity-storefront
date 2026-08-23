export async function upsertOrder(env, order) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/orders?on_conflict=stripe_session_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(order)
  });
  if (!res.ok) {
    console.error('[SUPABASE] upsert failed', res.status, await res.text());
  }
}
