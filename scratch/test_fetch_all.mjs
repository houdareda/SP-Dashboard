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

async function fetchAllInParallel(table, selectCols, filterBuilder) {
  const CHUNK_SIZE = 1000;
  // Get count first
  let countQuery = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filterBuilder) countQuery = filterBuilder(countQuery);
  const { count } = await countQuery;

  if (!count || count === 0) return [];

  const chunksCount = Math.ceil(count / CHUNK_SIZE);
  const promises = [];

  for (let i = 0; i < chunksCount; i++) {
    const from = i * CHUNK_SIZE;
    const to = from + CHUNK_SIZE - 1;
    let q = supabase.from(table).select(selectCols).range(from, to);
    if (filterBuilder) q = filterBuilder(q);
    promises.push(q);
  }

  const results = await Promise.all(promises);
  let allData = [];
  for (const res of results) {
    if (res.data) allData = allData.concat(res.data);
  }
  return allData;
}

async function testSpeed() {
  console.log('Testing speed of parallel chunked fetching...');
  const t0 = Date.now();

  const [expenses, funds, transfers] = await Promise.all([
    fetchAllInParallel('daily_expenses', 'agent_id, total_amount, marketing_expenses, marketing_1, marketing_2, marketing_3, personal_expense, expense_date'),
    fetchAllInParallel('fund_requests', 'agent_id, wallet_id, status, amount_requested, amount_approved, request_date'),
    fetchAllInParallel('expense_transfers', 'from_agent_id, to_agent_id, amount'),
  ]);

  console.log(`Fetched EVERYTHING in ${Date.now() - t0}ms!`);
  console.log(`Expenses count: ${expenses.length}`);
  console.log(`Funds count: ${funds.length}`);
  console.log(`Transfers count: ${transfers.length}`);
}

testSpeed();
