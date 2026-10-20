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

async function verifyAll() {
  let allExpenses = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('daily_expenses')
      .select('total_amount, personal_expense, marketing_1, marketing_2, marketing_3, marketing_expenses')
      .range(from, from + step - 1);
    if (!data || data.length === 0) break;
    allExpenses = allExpenses.concat(data);
    from += step;
  }

  console.log('Total fetched daily_expenses:', allExpenses.length);
  const totalAmountSum = allExpenses.reduce((s, e) => s + (Number(e.total_amount) || 0), 0);
  console.log('Total Amount Sum in DB:', totalAmountSum.toLocaleString('en-US'), 'EGP');

  let allFunds = [];
  from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('fund_requests')
      .select('amount_requested, amount_approved, status')
      .range(from, from + step - 1);
    if (!data || data.length === 0) break;
    allFunds = allFunds.concat(data);
    from += step;
  }
  console.log('\nTotal fetched fund_requests:', allFunds.length);
  const totalApprovedSum = allFunds.reduce((s, f) => s + (Number(f.amount_approved) || 0), 0);
  console.log('Total Approved Sum in DB:', totalApprovedSum.toLocaleString('en-US'), 'EGP');

  let allTransfers = [];
  from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('expense_transfers')
      .select('amount')
      .range(from, from + step - 1);
    if (!data || data.length === 0) break;
    allTransfers = allTransfers.concat(data);
    from += step;
  }
  console.log('\nTotal fetched expense_transfers:', allTransfers.length);
  const totalTransfersSum = allTransfers.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  console.log('Total Transfers Sum in DB:', totalTransfersSum.toLocaleString('en-US'), 'EGP');
}

verifyAll();
