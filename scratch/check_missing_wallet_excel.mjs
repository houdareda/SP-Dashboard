import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet (1).xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const missingWalletRows = [];
rows.forEach((r, idx) => {
  const hasFunds = r['Requested amount'] != null || r['مبلغ التحويل الفعلي'] != null || r['حاله طلب التحويل'] != null;
  if (hasFunds && (!r['Number Wallet'] || String(r['Number Wallet']).trim() === '')) {
    missingWalletRows.push({ rowIdx: idx + 2, agent: r['Agent Name'], reqAmt: r['Requested amount'], actAmt: r['مبلغ التحويل الفعلي'], wallet: r['Number Wallet'] });
  }
});

console.log('Count of fund requests with empty wallet in Excel:', missingWalletRows.length);
if (missingWalletRows.length > 0) {
  console.log('Sample missing wallet rows in Excel:', missingWalletRows.slice(0, 5));
}
