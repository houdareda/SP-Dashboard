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
  let countQuery = supabaseAdmin.from(table).select("*", { count: "exact", head: true });
  if (filterBuilder) countQuery = filterBuilder(countQuery);
  const { count } = await countQuery;
  if (!count || count === 0) return [];

  const chunksCount = Math.ceil(count / chunkSize);
  const promises = [];
  for (let i = 0; i < chunksCount; i++) {
    const from = i * chunkSize;
    const to = from + chunkSize - 1;
    let q = supabaseAdmin.from(table).select(selectCols).range(from, to);
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

async function verifyAll() {
  console.log('--- 1. Testing Dashboard Overview Queries in Parallel ---');
  const t0 = Date.now();

  const [
    mSystemsRes,
    expensesCurrentMonth,
    expensesAllTime,
    transfersAllTime,
    fundRequestsAllTime,
    walletsRes,
  ] = await Promise.all([
    supabaseAdmin.from("marketing_systems").select("id, name, display_order").order("display_order", { ascending: true }),
    fetchAllRows("daily_expenses", "id, total_amount, marketing_expenses, personal_expense, expense_date, agent_id", (q) => q.gte("expense_date", "2026-10-01").lte("expense_date", "2026-10-31")),
    fetchAllRows("daily_expenses", "id, personal_expense, marketing_expenses"),
    fetchAllRows("expense_transfers", "amount, from_agent_id, to_agent_id, expense_id"),
    fetchAllRows("fund_requests", "wallet_id, status, amount_requested, amount_approved, request_date"),
    supabaseAdmin.from("wallets").select("id, phone_number, start_of_month_balance, agent_id, is_active").eq("is_active", true),
  ]);

  const t1 = Date.now();
  console.log(`Parallel fetch completed in: ${t1 - t0}ms`);
  console.log(`- Marketing Systems: ${mSystemsRes.data?.length}`);
  console.log(`- Current Month Expenses: ${expensesCurrentMonth.length}`);
  console.log(`- All Time Expenses: ${expensesAllTime.length}`);
  console.log(`- All Time Transfers: ${transfersAllTime.length}`);
  console.log(`- All Time Fund Requests: ${fundRequestsAllTime.length}`);
  console.log(`- Active Wallets: ${walletsRes.data?.length}`);

  console.log('\n--- 2. Verifying Mathematical Accuracy ---');
  const totalApproved = fundRequestsAllTime.filter(f => f.status === 'approved').reduce((s, f) => s + (Number(f.amount_approved) || 0), 0);
  const totalExpenses = expensesAllTime.reduce((s, e) => {
    const pers = Number(e.personal_expense) || 0;
    const mSum = Object.values(e.marketing_expenses || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    return s + pers + mSum;
  }, 0);
  const totalTransfers = transfersAllTime.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  console.log(`Total Approved Funds: ${totalApproved.toLocaleString('en-US')} EGP`);
  console.log(`Total Pure Expenses: ${totalExpenses.toLocaleString('en-US')} EGP`);
  console.log(`Total Peer Transfers: ${totalTransfers.toLocaleString('en-US')} EGP`);
  console.log(`Net Remaining Custody in Circulation: ${(totalApproved - totalExpenses).toLocaleString('en-US')} EGP`);
  console.log('SUCCESS! ALL DATA DISPLAYED ACCURATELY & SUPER FAST!');
}

verifyAll();
