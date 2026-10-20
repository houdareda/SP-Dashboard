import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
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

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

function calculateAgentExcel(agentName) {
  let fundsApproved = 0;
  let expensesSubtracted = 0;
  let transfersSent = 0;
  let transfersReceived = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    const rowAgent = r[1] ? String(r[1]).trim() : '';
    const cancelStatus = r[21] ? String(r[21]).trim() : '';
    if (cancelStatus === 'طلب ملغي') continue;

    if (rowAgent === agentName) {
      const transStatus = r[24] ? String(r[24]).trim() : '';
      if (transStatus === 'تم التحويل') {
        fundsApproved += Number(r[22]) || 0; // Col W
      } else if (transStatus === 'تم التحويل بمبلغ مختلف') {
        fundsApproved += Number(r[23]) || 0; // Col X
      }

      // Expenses D, E, F, G, J
      expensesSubtracted += Number(r[3]) || 0; // Col D (M1)
      expensesSubtracted += Number(r[4]) || 0; // Col E (M2)
      expensesSubtracted += Number(r[5]) || 0; // Col F (M3)
      expensesSubtracted += Number(r[6]) || 0; // Col G (M4)
      expensesSubtracted += Number(r[9]) || 0; // Col J (Personal)

      // Transfers sent by this agent ONLY if recipient name exists:
      for (const [nameIdx, amtIdx] of [[10, 11], [12, 13], [14, 15], [16, 17], [18, 19]]) {
        const recName = r[nameIdx] ? String(r[nameIdx]).trim() : '';
        const recAmt = Number(r[amtIdx]) || 0;
        if (recName && recAmt > 0) {
          transfersSent += recAmt;
        }
      }
    }

    // Transfers received by this agent
    for (const [nameIdx, amtIdx] of [[10, 11], [12, 13], [14, 15], [16, 17], [18, 19]]) {
      const recName = r[nameIdx] ? String(r[nameIdx]).trim() : '';
      if (recName === agentName) {
        transfersReceived += Number(r[amtIdx]) || 0;
      }
    }
  }

  const custody = fundsApproved - expensesSubtracted - transfersSent + transfersReceived;
  return { custody, fundsApproved, expensesSubtracted, transfersSent, transfersReceived };
}

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

async function compare() {
  const dbExpenses = await fetchAllRows('daily_expenses', 'agent_id, total_amount, marketing_expenses, personal_expense');
  const dbTransfers = await fetchAllRows('expense_transfers', 'from_agent_id, to_agent_id, amount');
  const dbFunds = await fetchAllRows('fund_requests', 'agent_id, amount_approved, status');

  const mismatchedAgents = ['Samer gamal', 'Ramy Rezk', 'Amgad Emad', 'Abanob Essa', 'Michael waheeb', 'bishoy farid', 'Marco Abdo', 'Andrew Nasser'];

  for (const agentName of mismatchedAgents) {
    const ex = calculateAgentExcel(agentName);
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

    console.log(`\n=== Agent: ${agentName} ===`);
    console.log(`Custody: Excel=${ex.custody} | DB=${dbCustody} | Diff=${dbCustody - ex.custody}`);
    console.log(`Funds:   Excel=${ex.fundsApproved} | DB=${fApproved} | Diff=${fApproved - ex.fundsApproved}`);
    console.log(`PureExp: Excel=${ex.expensesSubtracted} | DB=${pureExp} | Diff=${pureExp - ex.expensesSubtracted}`);
    console.log(`TSent:   Excel=${ex.transfersSent} | DB=${tSent} | Diff=${tSent - ex.transfersSent}`);
    console.log(`TRec:    Excel=${ex.transfersReceived} | DB=${tRec} | Diff=${tRec - ex.transfersReceived}`);
  }
}

compare();
