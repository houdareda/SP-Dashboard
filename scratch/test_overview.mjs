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

async function testOverview() {
  // Query current month daily expenses
  const { data: exp, count } = await supabase
    .from('daily_expenses')
    .select('id, total_amount, marketing_expenses, expense_date', { count: 'exact' })
    .gte('expense_date', '2026-10-01')
    .lte('expense_date', '2026-10-31');

  console.log('October 2026 daily_expenses count:', count);
  const octTotal = (exp || []).reduce((s, e) => s + (Number(e.total_amount) || 0), 0);
  console.log('October 2026 total expenses:', octTotal.toLocaleString('en-US'), 'EGP');

  // Query agents in profiles
  const { data: agents } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('role', 'agent');
  console.log('Active agents in DB:', agents?.length);
}

testOverview();
