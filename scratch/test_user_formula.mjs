import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

console.log('Total rows:', rows.length);

// Expected from user's image:
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

// Check Column H and I (Marketing 5 and 6)
let sumH = 0;
let sumI = 0;
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r) continue;
  if (r[7] != null && r[7] !== '') sumH += Number(r[7]) || 0;
  if (r[8] != null && r[8] !== '') sumI += Number(r[8]) || 0;
}
console.log('Sum of Column H (Marketing 5):', sumH);
console.log('Sum of Column I (Marketing 6):', sumI);

// Let's implement the EXACT formula:
// SUMIFS(Sheet1!W:W, Sheet1!B:B, A3, Sheet1!Y:Y, "تم التحويل", Sheet1!V:V, "<>طلب ملغي")
// + SUMIFS(Sheet1!X:X, Sheet1!B:B, A3, Sheet1!Y:Y, "تم التحويل بمبلغ مختلف", Sheet1!V:V, "<>طلب ملغي")
// - SUMIFS(Sheet1!D:D, Sheet1!B:B, A3, Sheet1!V:V, "<>طلب ملغي")
// - SUMIFS(Sheet1!E:E, Sheet1!B:B, A3, Sheet1!V:V, "<>طلب ملغي")
// - SUMIFS(Sheet1!F:F, Sheet1!B:B, A3, Sheet1!V:V, "<>طلب ملغي")
// - SUMIFS(Sheet1!G:G, Sheet1!B:B, A3, Sheet1!V:V, "<>طلب ملغي")
// - SUMIFS(Sheet1!J:J, Sheet1!B:B, A3, Sheet1!V:V, "<>طلب ملغي")
// - SUMIFS(Sheet1!L:L, Sheet1!B:B, A3, Sheet1!V:V, "<>طلب ملغي")
// - SUMIFS(Sheet1!N:N, Sheet1!B:B, A3, Sheet1!V:V, "<>طلب ملغي")
// - SUMIFS(Sheet1!P:P, Sheet1!B:B, A3, Sheet1!V:V, "<>طلب ملغي")
// - SUMIFS(Sheet1!R:R, Sheet1!B:B, A3, Sheet1!V:V, "<>طلب ملغي")
// - SUMIFS(Sheet1!T:T, Sheet1!B:B, A3, Sheet1!V:V, "<>طلب ملغي")
// + SUMIFS(Sheet1!L:L, Sheet1!K:K, A3, Sheet1!V:V, "<>طلب ملغي")
// + SUMIFS(Sheet1!N:N, Sheet1!M:M, A3, Sheet1!V:V, "<>طلب ملغي")
// + SUMIFS(Sheet1!P:P, Sheet1!O:O, A3, Sheet1!V:V, "<>طلب ملغي")
// + SUMIFS(Sheet1!R:R, Sheet1!Q:Q, A3, Sheet1!V:V, "<>طلب ملغي")
// + SUMIFS(Sheet1!T:T, Sheet1!S:S, A3, Sheet1!V:V, "<>طلب ملغي")

function calculateAgent(agentName, includeHAndI = false) {
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

    // Check funds for this agent
    if (rowAgent === agentName) {
      const transStatus = r[24] ? String(r[24]).trim() : '';
      if (transStatus === 'تم التحويل') {
        fundsApproved += Number(r[22]) || 0; // Col W
      } else if (transStatus === 'تم التحويل بمبلغ مختلف') {
        fundsApproved += Number(r[23]) || 0; // Col X
      }

      // Expenses
      expensesSubtracted += Number(r[3]) || 0; // Col D (M1)
      expensesSubtracted += Number(r[4]) || 0; // Col E (M2)
      expensesSubtracted += Number(r[5]) || 0; // Col F (M3)
      expensesSubtracted += Number(r[6]) || 0; // Col G (M4)
      if (includeHAndI) {
        expensesSubtracted += Number(r[7]) || 0; // Col H (M5)
        expensesSubtracted += Number(r[8]) || 0; // Col I (M6)
      }
      expensesSubtracted += Number(r[9]) || 0; // Col J (Personal)

      // Transfers sent by this agent
      transfersSent += Number(r[11]) || 0; // Col L
      transfersSent += Number(r[13]) || 0; // Col N
      transfersSent += Number(r[15]) || 0; // Col P
      transfersSent += Number(r[17]) || 0; // Col R
      transfersSent += Number(r[19]) || 0; // Col T
    }

    // Transfers received by this agent (can happen even if rowAgent is another agent)
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

console.log('\n--- TESTING FORMULA (WITHOUT H & I, EXACTLY AS USER WROTE) ---');
let allMatchExact = true;
let totalDiff = 0;

for (const [agentName, expected] of Object.entries(expectedImage)) {
  const res = calculateAgent(agentName, false);
  const diff = res.custody - expected;
  if (diff !== 0) allMatchExact = false;
  totalDiff += Math.abs(diff);
  console.log(`${agentName.padEnd(20)} | Calculated: ${String(res.custody).padStart(8)} | Expected: ${String(expected).padStart(8)} | Diff: ${diff}`);
}

console.log('\nAll match exact without H & I?', allMatchExact, 'Total Abs Diff:', totalDiff);

console.log('\n--- TESTING FORMULA (WITH H & I INCLUDED) ---');
let allMatchWithH = true;
let totalDiffWithH = 0;
for (const [agentName, expected] of Object.entries(expectedImage)) {
  const res = calculateAgent(agentName, true);
  const diff = res.custody - expected;
  if (diff !== 0) allMatchWithH = false;
  totalDiffWithH += Math.abs(diff);
  if (diff !== 0) {
    console.log(`${agentName.padEnd(20)} | Calculated: ${String(res.custody).padStart(8)} | Expected: ${String(expected).padStart(8)} | Diff: ${diff}`);
  }
}
console.log('All match with H & I?', allMatchWithH, 'Total Abs Diff:', totalDiffWithH);
