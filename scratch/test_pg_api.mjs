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

async function testSql() {
  const url = `${env['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/rpc`;
  const key = env['SUPABASE_SERVICE_ROLE_KEY'];

  // Test if any sql endpoint responds
  try {
    const res = await fetch(`${env['NEXT_PUBLIC_SUPABASE_URL']}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'apikey': key,
      },
      body: JSON.stringify({ query: 'SELECT 1;' })
    });
    console.log('/pg/query status:', res.status, await res.text());
  } catch (e) {
    console.log('/pg/query error:', e.message);
  }
}

testSql();
