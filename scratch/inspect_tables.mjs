import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = (m[2] || '').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data: fr } = await supabase.from('fund_requests').select('*').limit(1);
  console.log('fund_requests fields:', fr && fr[0] ? Object.keys(fr[0]) : 'empty');

  const { data: et } = await supabase.from('expense_transfers').select('*').limit(1);
  console.log('expense_transfers fields:', et && et[0] ? Object.keys(et[0]) : 'empty');

  const { data: w } = await supabase.from('wallets').select('*').limit(1);
  console.log('wallets fields:', w && w[0] ? Object.keys(w[0]) : 'empty');
}

inspect();
