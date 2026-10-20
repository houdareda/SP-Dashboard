import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

let countBoth = 0;
let countOnlyW = 0; // only Requested amount
let countOnlyX = 0; // only مبلغ التحويل الفعلي
let countDiff = 0;  // W !== X

let sumW = 0;
let sumX = 0;

rows.forEach((r, idx) => {
  const w = r['Requested amount'];
  const x = r['مبلغ التحويل الفعلي'];
  const status = r['حاله طلب التحويل'];

  if (w != null && x != null) {
    countBoth++;
    sumW += Number(w) || 0;
    sumX += Number(x) || 0;
    if (Number(w) !== Number(x)) {
      countDiff++;
    }
  } else if (w != null) {
    countOnlyW++;
    sumW += Number(w) || 0;
  } else if (x != null) {
    countOnlyX++;
    sumX += Number(x) || 0;
  }
});

console.log('Both W & X present:', countBoth);
console.log('Rows where W !== X:', countDiff);
console.log('Only W present (Requested amount):', countOnlyW);
console.log('Only X present (مبلغ التحويل الفعلي):', countOnlyX);
console.log('Total Sum W (Requested):', sumW);
console.log('Total Sum X (Actual Transfer):', sumX);

// Let's inspect rows where only W is present
console.log('\n--- Sample rows where only W is present ---');
const onlyWRows = rows.filter(r => r['Requested amount'] != null && r['مبلغ التحويل الفعلي'] == null);
console.log(`Count: ${onlyWRows.length}`);
onlyWRows.slice(0, 5).forEach(r => console.log('  Agent:', r['Agent Name'], '| Req:', r['Requested amount'], '| Status:', r['حاله طلب التحويل'], '| Exp:', r['Total expenses']));

// Sample rows where W !== X
console.log('\n--- Sample rows where W !== X ---');
const diffRows = rows.filter(r => r['Requested amount'] != null && r['مبلغ التحويل الفعلي'] != null && Number(r['Requested amount']) !== Number(r['مبلغ التحويل الفعلي']));
diffRows.slice(0, 5).forEach(r => console.log('  Agent:', r['Agent Name'], '| Req:', r['Requested amount'], '| Act:', r['مبلغ التحويل الفعلي'], '| Status:', r['حاله طلب التحويل']));
