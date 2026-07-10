// Data access for the API. Uses Supabase when SUPABASE_URL + a key are set; otherwise falls
// back to the repo's JSON files (works locally and on a first deploy before Supabase is wired).
// Cached per warm instance to avoid re-reading on every invocation.

let cache = null;

export async function getData() {
  if (cache) return cache;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (url && key) {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(url, key, { auth: { persistSession: false } });
    const [inc, sp] = await Promise.all([
      supa.from('incentive').select('code,row'),
      supa.from('sp_dataset').select('data').eq('id', 1).single(),
    ]);
    if (inc.error) throw new Error('Supabase incentive: ' + inc.error.message);
    if (sp.error) throw new Error('Supabase sp_dataset: ' + sp.error.message);
    cache = { inc: Object.fromEntries(inc.data.map(r => [r.code, r.row])), sp: sp.data };
  } else {
    const [sp, inc] = await Promise.all([
      import('../../elevate_data.json', { with: { type: 'json' } }).then(m => m.default),
      import('../../elevate_incentive.json', { with: { type: 'json' } }).then(m => m.default),
    ]);
    cache = { sp, inc };
  }
  return cache;
}

export const dataSource = () =>
  (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY))
    ? 'supabase' : 'json-fallback';
