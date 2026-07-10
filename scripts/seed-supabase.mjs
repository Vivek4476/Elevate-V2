// Seed Supabase from the repo's JSON files.
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npm run seed
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(1); }
const supa = createClient(url, key, { auth: { persistSession: false } });

const inc = JSON.parse(readFileSync(new URL('../elevate_incentive.json', import.meta.url)));
const sp  = JSON.parse(readFileSync(new URL('../elevate_data.json', import.meta.url)));

const rows = Object.entries(inc).map(([code, row]) => ({ code, row }));
for (let i = 0; i < rows.length; i += 500) {
  const { error } = await supa.from('incentive').upsert(rows.slice(i, i + 500));
  if (error) { console.error('incentive upsert:', error.message); process.exit(1); }
}
const { error } = await supa.from('sp_dataset').upsert({ id: 1, data: sp });
if (error) { console.error('sp_dataset upsert:', error.message); process.exit(1); }
console.log(`Seeded ${rows.length} incentive rows + SP dataset into Supabase.`);
