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

async function verify() {
  console.log('=== VERIFYING NEW DATABASE IMPORT ===');
  const t0 = Date.now();

  const [expenses, funds, transfers, wallets, profiles] = await Promise.all([
    fetchAllRows('daily_expenses', 'id, agent_id, total_amount, marketing_expenses, personal_expense, expense_date'),
    fetchAllRows('fund_requests', 'id, agent_id, wallet_id, status, amount_requested, amount_approved, request_date'),
    fetchAllRows('expense_transfers', 'id, from_agent_id, to_agent_id, amount'),
    fetchAllRows('wallets', 'id, phone_number, agent_id'),
    fetchAllRows('profiles', 'id, full_name, role'),
  ]);

  console.log(`Fetched in ${Date.now() - t0}ms:`);
  console.log(`- Profiles: ${profiles.length}`);
  console.log(`- Wallets: ${wallets.length}`);
  console.log(`- Daily Expenses: ${expenses.length}`);
  console.log(`- Expense Transfers: ${transfers.length}`);
  console.log(`- Fund Requests: ${funds.length}`);

  const totalExp = expenses.reduce((s, e) => s + (Number(e.total_amount) || 0), 0);
  const totalPureExp = expenses.reduce((s, e) => {
    const pers = Number(e.personal_expense) || 0;
    const mSum = Object.values(e.marketing_expenses || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    return s + pers + mSum;
  }, 0);
  const totalTrans = transfers.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const approvedFunds = funds.filter(f => f.status === 'approved');
  const totalAppFunds = approvedFunds.reduce((s, f) => s + (Number(f.amount_approved) || 0), 0);

  console.log('\n--- FINANCIAL ACCURACY ---');
  console.log(`Total Expenses (Excel Column C): ${totalExp.toLocaleString('en-US')} EGP`);
  console.log(`Total Pure Expenses (Personal + M1..M6): ${totalPureExp.toLocaleString('en-US')} EGP`);
  console.log(`Total Peer Transfers (Internal): ${totalTrans.toLocaleString('en-US')} EGP`);
  console.log(`Total Approved Funds (Excel Column X): ${totalAppFunds.toLocaleString('en-US')} EGP`);
  console.log(`Net Remaining Custody in Circulation: ${(totalAppFunds - totalPureExp).toLocaleString('en-US')} EGP`);

  // Verify pure + transfers == totalExp
  const diff = totalExp - (totalPureExp + totalTrans);
  console.log(`Consistency Check: totalExp - (pureExp + transfers) = ${diff} (should be 0)`);

  const nullWalletsInFunds = funds.filter(f => !f.wallet_id);
  console.log(`Fund requests without wallet_id: ${nullWalletsInFunds.length}`);
}

verify();
