// Data access for the API. Uses Supabase when SUPABASE_URL + a key are set; otherwise falls
// back to the repo's JSON files (works locally and on a first deploy before Supabase is wired).
// Cached per warm instance to avoid re-reading on every invocation.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let cache = null;

// ── contract source (migration Step 3), behind the ELEVATE_CONTRACT_V3 flag ──
const CONTRACT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../pipeline/data/out/dse');

export const contractEnabled = () =>
  ['1', 'true', 'on', 'yes'].includes(String(process.env.ELEVATE_CONTRACT_V3 || '').toLowerCase());

// Per-DSE reconciled contract. Supabase table `contract(dse_id, data jsonb)` when configured;
// otherwise the local files emitted by `pipeline/cli.py build` (works in local dev). Null if absent.
export async function getContract(code) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && key) {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supa.from('contract').select('data').eq('dse_id', code).maybeSingle();
    if (error) throw new Error('Supabase contract: ' + error.message);
    return data ? data.data : null;
  }
  try {
    return JSON.parse(await readFile(join(CONTRACT_DIR, code + '.json'), 'utf8'));
  } catch {
    return null;
  }
}

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
