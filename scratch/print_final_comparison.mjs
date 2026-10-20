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
const agentsMap = JSON.parse(fs.readFileSync(path.resolve('scratch/agents_map.json'), 'utf-8'));
const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

const expectedImage = {
  'Abanob moner': 39838,
  'Mark George': 11527,
  'Samer gamal': 178211,
  'Andrew issac': 53000,
  'Abanoub Morgan': 53140,
  'Ramy Rezk': 102209,
  'Bishoy Yousry': 40000,
  'Mario Magdy': 9167,
  'Amgad Emad': 61200,
  'Abanob Essa': 177858,
  'Michael waheeb': 101684,
  'bishoy farid': 446336,
  'Marco Abdo': 67627,
  'Maged Emad': 38834,
  'bishoy samy': 147977,
  'Beshoy Medhat': 67100,
  'Peter abdo': 102800,
  'Andrew Nasser': 65963,
  'Kirillos Ragheb': 1365,
  'Bishoy Fawzy': 80265,
  'Mina Nader': 46800,
  'George Azize': 337465,
  'Thomas Throat': 6015,
  'Armia Talaat': 122034,
  'Kirillos William': 209419,
  'Bishoy Talaat': 74000
};

async function fetchAllRows(tableName, columns = '*') {
  let all = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase.from(tableName).select(columns).range(from, from + step - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < step) break;
    from += step;
  }
  return all;
}

async function printTable() {
  const dbExpenses = await fetchAllRows('daily_expenses', 'agent_id, total_amount, marketing_expenses, personal_expense');
  const dbTransfers = await fetchAllRows('expense_transfers', 'from_agent_id, to_agent_id, amount');
  const dbFunds = await fetchAllRows('fund_requests', 'agent_id, amount_approved, status');

  console.log('| Agent Name | Funds Approved | Pure Exp (All) | Sent Trans | Recv Trans | DB Custody | Excel Img | M5/M6 Diff |');
  console.log('|---|---|---|---|---|---|---|---|');

  let totDb = 0;
  let totImg = 0;

  for (const [agentName, expected] of Object.entries(expectedImage)) {
    const agentObj = agentsMap[normalize(agentName)];

    const fApproved = dbFunds
      .filter(f => f.agent_id === agentObj.id && f.status === 'approved')
      .reduce((sum, f) => sum + (Number(f.amount_approved) || 0), 0);

    const pureExp = dbExpenses
      .filter(e => e.agent_id === agentObj.id)
      .reduce((sum, e) => {
        const pers = Number(e.personal_expense) || 0;
        let mSum = 0;
        if (e.marketing_expenses) {
          mSum = Object.values(e.marketing_expenses).reduce((a, b) => a + (Number(b) || 0), 0);
        }
        return sum + pers + mSum;
      }, 0);

    const tSent = dbTransfers
      .filter(t => t.from_agent_id === agentObj.id)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const tRec = dbTransfers
      .filter(t => t.to_agent_id === agentObj.id)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const dbCustody = fApproved - pureExp - tSent + tRec;
    const diff = dbCustody - expected;

    totDb += dbCustody;
    totImg += expected;

    console.log(`| ${agentName} | ${fApproved.toLocaleString()} | ${pureExp.toLocaleString()} | ${tSent.toLocaleString()} | ${tRec.toLocaleString()} | ${dbCustody.toLocaleString()} | ${expected.toLocaleString()} | ${diff === 0 ? '0 (Exact)' : diff.toLocaleString()} |`);
  }

  console.log(`\nTOTAL DB Custody: ${totDb.toLocaleString()} EGP`);
  console.log(`TOTAL Image Custody: ${totImg.toLocaleString()} EGP`);
  console.log(`Total M5 & M6 Difference: ${(totDb - totImg).toLocaleString()} EGP`);
}

printTable();
