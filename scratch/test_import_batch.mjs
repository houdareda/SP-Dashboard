import { createClient } from '@supabase/supabase-js';
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

async function testInsert() {
  const agentId = Object.values(agentsMap)[0].id;
  const testExpId = crypto.randomUUID();

  // Test daily_expenses
  const { data: exp, error: expErr } = await supabase.from('daily_expenses').insert({
    id: testExpId,
    agent_id: agentId,
    expense_date: '2026-05-15',
    total_amount: 1000,
    personal_expense: 100,
    marketing_1: 900,
    marketing_2: 0,
    marketing_3: 0,
    marketing_expenses: {
      '11111111-1111-1111-1111-111111111111': 900
    },
    total_cash: 0
  }).select();

  console.log('Test daily_expenses insert:', { exp, error: expErr?.message });

  // Test expense_transfers
  const recipientId = Object.values(agentsMap)[1].id;
  const { data: trans, error: transErr } = await supabase.from('expense_transfers').insert({
    id: crypto.randomUUID(),
    expense_id: testExpId,
    from_agent_id: agentId,
    to_agent_id: recipientId,
    amount: 500
  }).select();

  console.log('Test expense_transfers insert:', { trans, error: transErr?.message });

  // Test fund_requests
  const { data: fund, error: fundErr } = await supabase.from('fund_requests').insert({
    id: crypto.randomUUID(),
    agent_id: agentId,
    request_date: '2026-05-15',
    amount_requested: 5000,
    amount_approved: 5000,
    status: 'approved',
    notes: 'Test note'
  }).select();

  console.log('Test fund_requests insert:', { fund, error: fundErr?.message });

  // Clean up test rows
  await supabase.from('expense_transfers').delete().eq('expense_id', testExpId);
  await supabase.from('daily_expenses').delete().eq('id', testExpId);
  if (fund?.[0]) await supabase.from('fund_requests').delete().eq('id', fund[0].id);
  console.log('✓ Test completed and cleaned up.');
}

testInsert();
