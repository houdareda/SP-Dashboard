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

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

function cleanPhone(raw) {
  let p = String(raw).trim();
  if (p.startsWith('20')) p = '0' + p.slice(2);
  else if (!p.startsWith('0')) p = '0' + p;
  return p;
}

async function createWallets() {
  console.log('--- Step 3: Cleaning and creating unique wallets ---');

  // Clear existing wallets first
  await supabase.from('wallets').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Map each unique phone number to the agent who used it most
  const phoneCounts = {}; // phone -> { [agentId]: count }

  rows.forEach(r => {
    const rawAgent = r['Agent Name'];
    const rawWallet = r['Number Wallet'];
    if (!rawAgent || !rawWallet) return;

    const norm = normalize(rawAgent);
    const agentObj = agentsMap[norm];
    if (!agentObj) return;

    const phone = cleanPhone(rawWallet);
    if (phone.length >= 10 && phone.length <= 12) {
      if (!phoneCounts[phone]) phoneCounts[phone] = {};
      phoneCounts[phone][agentObj.id] = (phoneCounts[phone][agentObj.id] || 0) + 1;
    }
  });

  const walletsToInsert = [];
  for (const [phone, agents] of Object.entries(phoneCounts)) {
    // Pick agent with highest count
    let bestAgent = null;
    let maxC = -1;
    for (const [agentId, count] of Object.entries(agents)) {
      if (count > maxC) {
        maxC = count;
        bestAgent = agentId;
      }
    }

    walletsToInsert.push({
      agent_id: bestAgent,
      phone_number: phone,
      start_of_month_balance: 0,
      is_active: true,
    });
  }

  console.log(`Total unique wallets to insert: ${walletsToInsert.length}`);

  const insertedWalletsMap = {}; // phone -> walletId
  const batchSize = 50;

  for (let i = 0; i < walletsToInsert.length; i += batchSize) {
    const batch = walletsToInsert.slice(i, i + batchSize);
    const { data, error } = await supabase.from('wallets').insert(batch).select('id, agent_id, phone_number');
    if (error) {
      console.error('Error inserting wallets batch:', error.message);
    } else {
      data?.forEach(w => {
        insertedWalletsMap[w.phone_number] = w.id;
      });
    }
  }

  fs.writeFileSync(path.resolve('scratch/wallets_map.json'), JSON.stringify(insertedWalletsMap, null, 2));
  console.log('✓ Successfully created', Object.keys(insertedWalletsMap).length, 'wallets and saved wallets_map.json');
}

createWallets();
