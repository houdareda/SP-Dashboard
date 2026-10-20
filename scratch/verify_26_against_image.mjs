import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

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

function calculateAgent(agentName) {
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

console.log('=== VERIFYING ALL 26 AGENTS AGAINST IMAGE ===');
let allMatch = true;
let totalCustody = 0;

for (const [agentName, expected] of Object.entries(expectedImage)) {
  const res = calculateAgent(agentName);
  const diff = res.custody - expected;
  if (diff !== 0) allMatch = false;
  totalCustody += res.custody;
  console.log(`${agentName.padEnd(20)} | Expected: ${String(expected).padStart(8)} | Calculated: ${String(res.custody).padStart(8)} | Match: ${diff === 0 ? '✓ EXACT' : '✗ MISMATCH'}`);
}

console.log('\nResult: All 26 agents match 100%?', allMatch ? 'YES! 100% PERFECT MATCH!' : 'NO');
console.log('Total Custody for all 26 agents:', totalCustody.toLocaleString('en-US'), 'EGP');
