import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const newFile = path.resolve('Untitled spreadsheet (1).xlsx');
const wb = xlsx.readFile(newFile);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

const agentsMap = JSON.parse(fs.readFileSync(path.resolve('scratch/agents_map.json'), 'utf-8'));

// Track wallets and which agents used them
const walletToAgents = {};

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r) continue;
  const rawAgent = r[1] ? String(r[1]).trim().toLowerCase() : null;
  const rawWallet = r[20] !== undefined && r[20] !== null ? String(r[20]).trim() : null;

  if (rawWallet && rawWallet !== '' && rawWallet !== 'null' && rawWallet !== 'undefined') {
    // Clean wallet number (remove spaces, scientific notation if any)
    let cleanWallet = rawWallet;
    if (cleanWallet.includes('e+') || cleanWallet.includes('E+')) {
      cleanWallet = String(Number(cleanWallet));
    }
    // ensure standard phone format if 10 or 11 digits
    if (/^\d+$/.test(cleanWallet)) {
      if (cleanWallet.length === 10 && cleanWallet.startsWith('1')) {
        cleanWallet = '0' + cleanWallet;
      }
    }

    if (!walletToAgents[cleanWallet]) {
      walletToAgents[cleanWallet] = new Set();
    }
    if (rawAgent && agentsMap[rawAgent]) {
      walletToAgents[cleanWallet].add(agentsMap[rawAgent].id);
    }
  }
}

const walletKeys = Object.keys(walletToAgents);
console.log('Total cleaned unique wallets:', walletKeys.length);

let singleAgentWallets = 0;
let multiAgentWallets = 0;
let zeroAgentWallets = 0;

for (const w of walletKeys) {
  const ags = Array.from(walletToAgents[w]);
  if (ags.length === 1) singleAgentWallets++;
  else if (ags.length > 1) multiAgentWallets++;
  else zeroAgentWallets++;
}

console.log('Single agent wallets:', singleAgentWallets);
console.log('Multi agent wallets:', multiAgentWallets);
console.log('Zero agent wallets:', zeroAgentWallets);

if (multiAgentWallets > 0) {
  console.log('\nSample multi-agent wallets:');
  for (const w of walletKeys) {
    if (walletToAgents[w].size > 1) {
      console.log(`Wallet ${w} used by ${walletToAgents[w].size} agents`);
    }
  }
}
