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

async function checkFundCols() {
  const { data, error } = await supabase.from('fund_requests').select('*').limit(1);
  console.log('fund_requests select error:', error);
  // Try inserting minimal row
  const { data: ins, error: insErr } = await supabase.from('fund_requests').insert({
    agent_id: '00828260-aa66-47aa-aaf6-d7b5a74a2a3a',
    request_date: '2026-05-15',
    amount_requested: 100,
    status: 'approved'
  }).select();
  console.log('Minimal insert:', { ins, insErr: insErr?.message });
  if (ins?.[0]) {
    console.log('Columns of fund_requests:', Object.keys(ins[0]));
    await supabase.from('fund_requests').delete().eq('id', ins[0].id);
  }
}

checkFundCols();
