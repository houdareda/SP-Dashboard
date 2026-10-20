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

async function inspectSchema() {
  // Check users in auth.users
  const { data: authUsers, error: aErr } = await supabase.auth.admin.listUsers({ perPage: 100 });
  console.log('Auth users count:', authUsers?.users?.length);
  authUsers?.users?.forEach(u => console.log('  Auth user:', u.id, u.email));

  // Check profiles
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('\nProfiles count:', profiles?.length);
  profiles?.forEach(p => console.log('  Profile:', p.id, p.email, p.role, p.full_name));

  // Check foreign keys / dependencies on daily_expenses, etc.
  const { data: mSystems } = await supabase.from('marketing_systems').select('*').order('order_index');
  console.log('\nMarketing systems:', mSystems);
}

inspectSchema();
