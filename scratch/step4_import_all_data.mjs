import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
const walletsMap = JSON.parse(fs.readFileSync(path.resolve('scratch/wallets_map.json'), 'utf-8'));

const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

function cleanPhone(raw) {
  if (!raw) return null;
  let p = String(raw).trim();
  if (p.startsWith('20')) p = '0' + p.slice(2);
  else if (!p.startsWith('0')) p = '0' + p;
  return p;
}

function parseRowDate(r) {
  if (r.date === 42095 && r['تاريخ يدوي'] === '22/5') return '2026-05-22';
  if (typeof r.date === 'number') {
    const p = xlsx.SSF.parse_date_code(r.date);
    if (p && p.y && p.m && p.d) {
      return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
    }
  }
  return null;
}

const ADMIN_ID = 'd983615d-c26a-4204-8e0a-63ffc8d76a1f';

const SYS_M1 = '11111111-1111-1111-1111-111111111111';
const SYS_M2 = '22222222-2222-2222-2222-222222222222';
const SYS_M3 = '33333333-3333-3333-3333-333333333333';
const SYS_M4 = '485d468d-9712-418e-a24d-7656b4899f02';
const SYS_M5 = '7f218154-abd0-40e1-a1a3-30b006afe638';
const SYS_M6 = 'cecdb70c-7767-4d95-831b-10e83cd71ac2';

async function importAllData() {
  console.log('--- Step 4: Preparing data for import ---');

  const filePath = path.resolve('Untitled spreadsheet.xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets['Sheet1'];
  const rows = xlsx.utils.sheet_to_json(sheet);

  const expensesToInsert = [];
  const transfersToInsert = [];
  const fundsToInsert = [];

  rows.forEach((r, idx) => {
    const rawAgent = r['Agent Name'];
    if (!rawAgent) return; // skip empty rows

    const norm = normalize(rawAgent);
    const agentObj = agentsMap[norm];
    if (!agentObj) {
      console.warn(`Row ${idx}: Agent not found "${rawAgent}"`);
      return;
    }

    const dateStr = parseRowDate(r);
    if (!dateStr) {
      console.warn(`Row ${idx}: Date parse failed for agent ${rawAgent}`);
      return;
    }

    const hasExpenses = r['Total expenses'] != null || r['expenses Markt-1'] != null || r['Personal expenses'] != null;
    const hasFunds = r['Requested amount'] != null || r['مبلغ التحويل الفعلي'] != null || r['حاله طلب التحويل'] != null;

    // --- EXPENSES ---
    if (hasExpenses) {
      const expenseId = crypto.randomUUID();
      const m1 = Number(r['expenses Markt-1']) || 0;
      const m2 = Number(r['expenses Markt-2']) || 0;
      const m3 = Number(r['expenses Markt-3']) || 0;
      const m4 = Number(r['expenses Markt-4']) || 0;
      const m5 = Number(r['expenses Markt-5']) || 0;
      const m6 = Number(r['expenses Markt-6']) || 0;
      const personal = Number(r['Personal expenses']) || 0;

      const marketingExpenses = {
        [SYS_M1]: m1,
        [SYS_M2]: m2,
        [SYS_M3]: m3,
        [SYS_M4]: m4,
        [SYS_M5]: m5,
        [SYS_M6]: m6,
      };

      const totalAmount = Number(r['Total expenses']) || (m1 + m2 + m3 + m4 + m5 + m6 + personal);

      expensesToInsert.push({
        id: expenseId,
        agent_id: agentObj.id,
        expense_date: dateStr,
        total_amount: totalAmount,
        personal_expense: personal,
        marketing_1: m1,
        marketing_2: m2,
        marketing_3: m3,
        marketing_expenses: marketingExpenses,
        total_cash: 0,
        agent_name: agentObj.name,
      });

      // Peer-to-peer transfers inside this expense
      for (let i = 1; i <= 5; i++) {
        const nameKey = i === 1 ? 'Recipient Name' : `Recipient Name ${i}`;
        const monyKey = i === 1 ? 'Recipient Mony' : `Recipient Mony ${i}`;
        const recName = r[nameKey];
        const recMony = r[monyKey];

        if (recName && recMony && Number(recMony) > 0) {
          const recNorm = normalize(recName);
          const recObj = agentsMap[recNorm];
          if (recObj) {
            transfersToInsert.push({
              id: crypto.randomUUID(),
              expense_id: expenseId,
              from_agent_id: agentObj.id,
              to_agent_id: recObj.id,
              amount: Number(recMony),
            });
          }
        }
      }
    }

    // --- FUNDS ---
    if (hasFunds) {
      const reqAmount = Number(r['Requested amount']) || Number(r['مبلغ التحويل الفعلي']) || 0;
      const rawActual = r['مبلغ التحويل الفعلي'];
      const rawStatus = r['حاله طلب التحويل'];

      let status = 'approved';
      let appAmount = rawActual != null ? Number(rawActual) : reqAmount;

      if (rawStatus === 'مرفوض') {
        status = 'rejected';
        appAmount = 0;
      }

      const phone = cleanPhone(r['Number Wallet']);
      const walletId = phone ? (walletsMap[phone] || null) : null;

      fundsToInsert.push({
        id: crypto.randomUUID(),
        agent_id: agentObj.id,
        wallet_id: walletId,
        request_date: dateStr,
        amount_requested: reqAmount,
        amount_approved: appAmount,
        status: status,
        approved_by: ADMIN_ID,
        approved_at: dateStr + 'T12:00:00Z',
        created_at: dateStr + 'T10:00:00Z',
      });
    }
  });

  console.log(`Parsed totals:`);
  console.log(`  Daily Expenses: ${expensesToInsert.length} records`);
  console.log(`  Expense Transfers: ${transfersToInsert.length} records`);
  console.log(`  Fund Requests: ${fundsToInsert.length} records`);

  const BATCH_SIZE = 250;

  // 1. Insert daily_expenses
  console.log('\nInserting daily_expenses in batches...');
  for (let i = 0; i < expensesToInsert.length; i += BATCH_SIZE) {
    const batch = expensesToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('daily_expenses').insert(batch);
    if (error) {
      console.error(`  Error in daily_expenses batch ${i / BATCH_SIZE + 1}:`, error.message);
      return;
    }
    process.stdout.write(`  Inserted ${Math.min(i + BATCH_SIZE, expensesToInsert.length)}/${expensesToInsert.length}\r`);
  }
  console.log('\n✓ daily_expenses inserted successfully!');

  // 2. Insert expense_transfers
  console.log('\nInserting expense_transfers in batches...');
  for (let i = 0; i < transfersToInsert.length; i += BATCH_SIZE) {
    const batch = transfersToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('expense_transfers').insert(batch);
    if (error) {
      console.error(`  Error in expense_transfers batch ${i / BATCH_SIZE + 1}:`, error.message);
      return;
    }
    process.stdout.write(`  Inserted ${Math.min(i + BATCH_SIZE, transfersToInsert.length)}/${transfersToInsert.length}\r`);
  }
  console.log('\n✓ expense_transfers inserted successfully!');

  // 3. Insert fund_requests
  console.log('\nInserting fund_requests in batches...');
  for (let i = 0; i < fundsToInsert.length; i += BATCH_SIZE) {
    const batch = fundsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('fund_requests').insert(batch);
    if (error) {
      console.error(`  Error in fund_requests batch ${i / BATCH_SIZE + 1}:`, error.message);
      return;
    }
    process.stdout.write(`  Inserted ${Math.min(i + BATCH_SIZE, fundsToInsert.length)}/${fundsToInsert.length}\r`);
  }
  console.log('\n✓ fund_requests inserted successfully!');

  console.log('\n🎉 ALL DATA MIGRATED WITH 100% SUCCESS!');
}

importAllData();
