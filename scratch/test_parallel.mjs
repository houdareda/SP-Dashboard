import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1]] = val.trim();
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function testParallelAllTime() {
  const t0 = Date.now();

  // Run in parallel chunks of 1000
  const [chunk1, chunk2, chunk3, chunk4, chunk5] = await Promise.all([
    supabase.from('daily_expenses').select('personal_expense, marketing_expenses, marketing_1, marketing_2, marketing_3').range(0, 999),
    supabase.from('daily_expenses').select('personal_expense, marketing_expenses, marketing_1, marketing_2, marketing_3').range(1000, 1999),
    supabase.from('daily_expenses').select('personal_expense, marketing_expenses, marketing_1, marketing_2, marketing_3').range(2000, 2999),
    supabase.from('daily_expenses').select('personal_expense, marketing_expenses, marketing_1, marketing_2, marketing_3').range(3000, 3999),
    supabase.from('daily_expenses').select('personal_expense, marketing_expenses, marketing_1, marketing_2, marketing_3').range(4000, 4999),
  ]);

  const allExp = [
    ...(chunk1.data || []),
    ...(chunk2.data || []),
    ...(chunk3.data || []),
    ...(chunk4.data || []),
    ...(chunk5.data || []),
  ];

  console.log(`Fetched all ${allExp.length} expenses in parallel: ${Date.now() - t0}ms`);
}

testParallelAllTime();
