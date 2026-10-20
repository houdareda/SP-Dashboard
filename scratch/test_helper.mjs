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

const supabaseAdmin = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function fetchAllRows(table, selectCols, filterBuilder, chunkSize = 1000) {
  try {
    let countQuery = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
    if (filterBuilder) {
      countQuery = filterBuilder(countQuery);
    }
    const { count, error: countErr } = await countQuery;
    if (countErr) {
      console.error(`fetchAllRows count error on ${table}:`, countErr);
      return [];
    }
    if (!count || count === 0) return [];

    if (count <= chunkSize) {
      let q = supabaseAdmin.from(table).select(selectCols).range(0, count - 1);
      if (filterBuilder) q = filterBuilder(q);
      const { data, error } = await q;
      if (error) {
        console.error(`fetchAllRows data error on ${table}:`, error);
        return [];
      }
      return data || [];
    }

    const chunksCount = Math.ceil(count / chunkSize);
    const promises = [];

    for (let i = 0; i < chunksCount; i++) {
      const from = i * chunkSize;
      const to = from + chunkSize - 1;
      let q = supabaseAdmin.from(table).select(selectCols).range(from, to);
      if (filterBuilder) {
        q = filterBuilder(q);
      }
      promises.push(q);
    }

    const results = await Promise.all(promises);
    let allData = [];
    for (const res of results) {
      if (res.data) {
        allData = allData.concat(res.data);
      }
    }
    return allData;
  } catch (err) {
    console.error(`fetchAllRows exception on ${table}:`, err);
    return [];
  }
}

async function run() {
  const t0 = Date.now();
  console.log('Testing fetchAllRows on all tables simultaneously...');

  const [expenses, funds, transfers] = await Promise.all([
    fetchAllRows('daily_expenses', 'id, total_amount, marketing_expenses, personal_expense, expense_date, agent_id'),
    fetchAllRows('fund_requests', 'id, agent_id, wallet_id, status, amount_requested, amount_approved, request_date'),
    fetchAllRows('expense_transfers', 'id, amount, from_agent_id, to_agent_id, expense_id'),
  ]);

  console.log(`Finished in ${Date.now() - t0}ms`);
  console.log(`expenses: ${expenses.length} rows`);
  console.log(`funds: ${funds.length} rows`);
  console.log(`transfers: ${transfers.length} rows`);

  const expTotal = expenses.reduce((s, e) => s + (Number(e.total_amount) || 0), 0);
  const fundsTotal = funds.filter(f => f.status === 'approved').reduce((s, f) => s + (Number(f.amount_approved) || 0), 0);
  console.log(`Total Expenses Sum: ${expTotal.toLocaleString('en-US')} EGP`);
  console.log(`Total Approved Funds Sum: ${fundsTotal.toLocaleString('en-US')} EGP`);
}

run();
