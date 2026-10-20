import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const agentWallets = {};

rows.forEach(r => {
  const agent = r['Agent Name'];
  const wallet = r['Number Wallet'];
  if (agent && wallet) {
    const cleanAgent = String(agent).trim();
    // Normalize phone number (some start with 20 or 12 or 012)
    let cleanWallet = String(wallet).trim();
    if (cleanWallet.startsWith('20')) cleanWallet = '0' + cleanWallet.slice(2);
    else if (!cleanWallet.startsWith('0')) cleanWallet = '0' + cleanWallet;

    if (!agentWallets[cleanAgent]) agentWallets[cleanAgent] = new Set();
    agentWallets[cleanAgent].add(cleanWallet);
  }
});

console.log('Agent Wallets mapping:');
for (const [agent, wallets] of Object.entries(agentWallets)) {
  console.log(`  ${agent}:`, Array.from(wallets));
}
