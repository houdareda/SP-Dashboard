import { createClient } from '@supabase/supabase-js';
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

const ADMIN_EMAIL = 'redaoda86@gmail.com';
const ACCOUNTANT_EMAIL = 'reyadelpadre@gmial.com';

async function cleanupDatabase() {
  console.log('--- Step 1: Cleaning transactional data ---');

  // 1. Delete edit_expense_requests
  const { error: e1 } = await supabase.from('edit_expense_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e1) console.error('Error deleting edit_expense_requests:', e1.message);
  else console.log('✓ Cleared edit_expense_requests');

  // 2. Delete expense_transfers
  const { error: e2 } = await supabase.from('expense_transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e2) console.error('Error deleting expense_transfers:', e2.message);
  else console.log('✓ Cleared expense_transfers');

  // 3. Delete daily_expenses
  const { error: e3 } = await supabase.from('daily_expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e3) console.error('Error deleting daily_expenses:', e3.message);
  else console.log('✓ Cleared daily_expenses');

  // 4. Delete fund_requests
  const { error: e4 } = await supabase.from('fund_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e4) console.error('Error deleting fund_requests:', e4.message);
  else console.log('✓ Cleared fund_requests');

  // 5. Delete wallets
  const { error: e5 } = await supabase.from('wallets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e5) console.error('Error deleting wallets:', e5.message);
  else console.log('✓ Cleared wallets');

  // 6. Delete users from auth.users (except Admin and Reyad)
  console.log('\n--- Step 2: Cleaning users ---');
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const users = authData?.users || [];

  for (const u of users) {
    const emailNorm = (u.email || '').toLowerCase().trim();
    if (emailNorm === ADMIN_EMAIL.toLowerCase() || emailNorm === ACCOUNTANT_EMAIL.toLowerCase()) {
      console.log(`[KEEP] Preserving ${u.email} (${u.id})`);
    } else {
      console.log(`[DELETE] Removing user ${u.email} (${u.id})...`);
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.error(`  Error deleting auth user ${u.email}:`, delErr.message);
      }
    }
  }

  // 7. Verify profiles remaining
  const { data: remainingProfiles } = await supabase.from('profiles').select('id, email, full_name, role');
  console.log('\nRemaining profiles in DB:');
  console.log(remainingProfiles);
}

cleanupDatabase();
