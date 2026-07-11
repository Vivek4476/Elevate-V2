// Seed the reconciled per-DSE contracts into Supabase (migration Step 3 / elevate_contract_v3).
// Generate the contracts first, then seed:
//   ./pipeline/.venv/bin/python pipeline/cli.py build --month 2026-04
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npm run seed:contract
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(1); }
const supa = createClient(url, key, { auth: { persistSession: false } });

const dir = join(dirname(fileURLToPath(import.meta.url)), '../pipeline/data/out/dse');
let files;
try {
  files = readdirSync(dir).filter((f) => f.endsWith('.json'));
} catch {
  console.error('No contracts at', dir, '— run `pipeline/cli.py build` first.');
  process.exit(1);
}

const rows = files.map((f) => ({ dse_id: f.replace(/\.json$/, ''), data: JSON.parse(readFileSync(join(dir, f))) }));
for (let i = 0; i < rows.length; i += 500) {
  const { error } = await supa.from('contract').upsert(rows.slice(i, i + 500));
  if (error) { console.error('contract upsert:', error.message); process.exit(1); }
  console.log(`  upserted ${Math.min(i + 500, rows.length)}/${rows.length}`);
}
console.log(`Seeded ${rows.length} contracts into Supabase. Set ELEVATE_CONTRACT_V3=1 to serve them.`);
