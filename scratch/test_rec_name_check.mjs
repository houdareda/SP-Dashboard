import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (4).xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

// What if transfers are ONLY subtracted if there is a Recipient Name?
// In row 3336, Recipient Mony 5 has 20000, but Recipient Name 5 is EMPTY!
// In row 3574, Recipient Mony 5 has 60000, but Recipient Name 5 is EMPTY!

function calculateWithRecipientNameCheck(agentName) {
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

const bishoy = calculateWithRecipientNameCheck('Bishoy Yousry');
const andrew = calculateWithRecipientNameCheck('Andrew Nasser');

console.log('Bishoy Yousry with recipient name check:', bishoy.custody);
console.log('Andrew Nasser with recipient name check:', andrew.custody);
