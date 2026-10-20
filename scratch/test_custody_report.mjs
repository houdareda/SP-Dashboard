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

async function testCustodyReport() {
  const t0 = Date.now();
  console.log('Testing Custody Report Calculation...');

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role, is_active")
    .in("role", ["agent", "senioragent"])
    .order("full_name");

  const profileIds = profiles.map(p => p.id);

  const [walletsRes, matchedRequests, matchedExpenses, matchedTransfers] = await Promise.all([
    supabaseAdmin.from("wallets").select("id, phone_number, start_of_month_balance, agent_id, is_active").in("agent_id", profileIds),
    fetchAllRows("fund_requests", "agent_id, wallet_id, status, amount_requested, amount_approved, request_date", (q) => q.in("agent_id", profileIds)),
    fetchAllRows("daily_expenses", "agent_id, total_amount, marketing_expenses, marketing_1, marketing_2, marketing_3, personal_expense, expense_date", (q) => q.in("agent_id", profileIds)),
    fetchAllRows("expense_transfers", "from_agent_id, to_agent_id, amount"),
  ]);

  const matchedWallets = walletsRes.data || [];

  let totalCustodyAllAgents = 0;
  let totalApprovedAll = 0;
  let totalExpensesAll = 0;

  profiles.forEach(p => {
    const approvedFundsSum = matchedRequests
      .filter((r) => r.agent_id === p.id && r.status === "approved")
      .reduce((sum, r) => sum + (Number(r.amount_approved) || 0), 0);

    const pureExpensesSum = matchedExpenses
      .filter((e) => e.agent_id === p.id)
      .reduce((sum, e) => {
        const pers = Number(e.personal_expense) || 0;
        let mSum = 0;
        if (e.marketing_expenses && Object.keys(e.marketing_expenses).length > 0) {
          mSum = Object.values(e.marketing_expenses).reduce((a, b) => a + (Number(b) || 0), 0);
        } else {
          mSum = (Number(e.marketing_1) || 0) + (Number(e.marketing_2) || 0) + (Number(e.marketing_3) || 0);
        }
        return sum + pers + mSum;
      }, 0);

    const sentTransfersSum = matchedTransfers
      .filter((t) => t.from_agent_id === p.id)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const receivedTransfersSum = matchedTransfers
      .filter((t) => t.to_agent_id === p.id)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const custodyCurrent = (approvedFundsSum + receivedTransfersSum) - (pureExpensesSum + sentTransfersSum);

    totalCustodyAllAgents += custodyCurrent;
    totalApprovedAll += approvedFundsSum;
    totalExpensesAll += pureExpensesSum;
  });

  console.log(`Report computed in ${Date.now() - t0}ms for ${profiles.length} agents:`);
  console.log(`Total Approved Funds: ${totalApprovedAll.toLocaleString('en-US')} EGP`);
  console.log(`Total Pure Expenses: ${totalExpensesAll.toLocaleString('en-US')} EGP`);
  console.log(`Total Custody across all agents: ${totalCustodyAllAgents.toLocaleString('en-US')} EGP`);
}

testCustodyReport();
