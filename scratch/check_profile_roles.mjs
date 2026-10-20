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

async function checkRoles() {
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, role, email');
  const roleCounts = {};
  profiles.forEach(p => {
    roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
  });
  console.log('Role counts in DB profiles:', roleCounts);
  const sample = profiles.filter(p => p.role !== 'admin');
  console.log('Sample profiles:', sample.slice(0, 5));
}

checkRoles();
