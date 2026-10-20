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

async function verify() {
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, role');
  const { count: expCount } = await supabase.from('daily_expenses').select('*', { count: 'exact', head: true });
  const { count: fundCount } = await supabase.from('fund_requests').select('*', { count: 'exact', head: true });
  const { count: transCount } = await supabase.from('expense_transfers').select('*', { count: 'exact', head: true });
  const { count: walletCount } = await supabase.from('wallets').select('*', { count: 'exact', head: true });

  console.log('--- Final Database State ---');
  console.log('Profiles Count:', profiles?.length);
  console.log('  Admin:', profiles?.find(p => p.role === 'admin')?.email);
  console.log('  Accountant:', profiles?.find(p => p.role === 'accountant')?.email);
  console.log('  Agents count:', profiles?.filter(p => p.role === 'agent')?.length);

  console.log('\nRecords Count:');
  console.log('  daily_expenses:', expCount);
  console.log('  expense_transfers:', transCount);
  console.log('  fund_requests:', fundCount);
  console.log('  wallets:', walletCount);

  // Sum check
  const { data: expSums } = await supabase.from('daily_expenses').select('total_amount');
  const totalExp = (expSums || []).reduce((acc, e) => acc + (Number(e.total_amount) || 0), 0);
  console.log('\nTotal Expenses Sum:', totalExp.toLocaleString('en-US'), 'EGP');

  const { data: fundSums } = await supabase.from('fund_requests').select('amount_approved');
  const totalFund = (fundSums || []).reduce((acc, f) => acc + (Number(f.amount_approved) || 0), 0);
  console.log('Total Approved Funds Sum:', totalFund.toLocaleString('en-US'), 'EGP');
}

verify();
