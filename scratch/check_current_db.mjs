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

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrent() {
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active');
  console.log('Profiles in DB:', profiles);

  const { count: expCount } = await supabase.from('daily_expenses').select('*', { count: 'exact', head: true });
  const { count: fundCount } = await supabase.from('fund_requests').select('*', { count: 'exact', head: true });
  const { count: transCount } = await supabase.from('expense_transfers').select('*', { count: 'exact', head: true });
  const { count: editCount } = await supabase.from('edit_expense_requests').select('*', { count: 'exact', head: true });
  const { count: walletCount } = await supabase.from('wallets').select('*', { count: 'exact', head: true });
  const { data: systems } = await supabase.from('marketing_systems').select('*');

  console.log('Counts:', {
    profiles: profiles?.length,
    daily_expenses: expCount,
    fund_requests: fundCount,
    expense_transfers: transCount,
    edit_expense_requests: editCount,
    wallets: walletCount,
    marketing_systems: systems?.length
  });
}

checkCurrent();
