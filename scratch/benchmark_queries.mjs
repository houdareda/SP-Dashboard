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

async function benchmark() {
  console.log('=== Benchmarking Queries ===');

  let t0 = Date.now();
  const { data: d1 } = await supabase.from('daily_expenses').select('id, total_amount, marketing_expenses').gte('expense_date', '2026-10-01').lte('expense_date', '2026-10-31');
  console.log(`1. Current Month Expenses: ${Date.now() - t0}ms (${d1?.length} rows)`);

  t0 = Date.now();
  const { data: d2 } = await supabase.from('daily_expenses').select('id, personal_expense, marketing_expenses, marketing_1, marketing_2, marketing_3');
  console.log(`2. All-Time Expenses (limit 1000): ${Date.now() - t0}ms (${d2?.length} rows)`);

  t0 = Date.now();
  const { data: d3 } = await supabase.from('fund_requests').select('status, amount_requested, amount_approved');
  console.log(`3. All-Time Fund Requests (limit 1000): ${Date.now() - t0}ms (${d3?.length} rows)`);

  t0 = Date.now();
  const { data: d4 } = await supabase.from('expense_transfers').select('amount, from_agent_id, to_agent_id');
  console.log(`4. All-Time Expense Transfers: ${Date.now() - t0}ms (${d4?.length} rows)`);

  t0 = Date.now();
  const { data: d5 } = await supabase.from('wallets').select('*, agent_profile:agent_id(full_name)').eq('is_active', true);
  console.log(`5. All Active Wallets with Join: ${Date.now() - t0}ms (${d5?.length} rows)`);
}

benchmark();
