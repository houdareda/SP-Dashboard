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

async function simulateDashboard() {
  // Let's check how many daily_expenses exist in current month (October 2026):
  const egyptDate = new Date();
  const currentMonthStart = '2026-10-01';
  const currentMonthEnd = '2026-10-31';

  // 1. Current month expenses
  const { data: expensesCurrentMonth } = await supabase
    .from('daily_expenses')
    .select('id, total_amount, marketing_expenses, marketing_1, marketing_2, marketing_3, personal_expense, expense_date, agent_id')
    .gte('expense_date', currentMonthStart)
    .lte('expense_date', currentMonthEnd);

  console.log('October 2026 expenses rows count:', expensesCurrentMonth?.length);
  const octExpensesSum = (expensesCurrentMonth || []).reduce((s, e) => s + (Number(e.total_amount) || 0), 0);
  console.log('October 2026 total expenses sum:', octExpensesSum.toLocaleString('en-US'));

  // 2. All-time expenses
  // NOTE: PostgREST default limit is 1000! Let's check if dashboard.ts uses pagination or if select() truncates at 1000!
  const { data: expAllTime } = await supabase
    .from('daily_expenses')
    .select('id, personal_expense, marketing_expenses, marketing_1, marketing_2, marketing_3, total_amount');

  console.log('\nexpAllTime without pagination returned length:', expAllTime?.length);

  // 3. Fund requests all-time
  const { data: fundAllTime } = await supabase
    .from('fund_requests')
    .select('status, amount_requested, amount_approved');

  console.log('fundAllTime without pagination returned length:', fundAllTime?.length);
}

simulateDashboard();
