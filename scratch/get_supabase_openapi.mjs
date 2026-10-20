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

async function getOpenApi() {
  const res = await fetch(`${env['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/?apikey=${env['SUPABASE_SERVICE_ROLE_KEY']}`, {
    headers: {
      'apikey': env['SUPABASE_SERVICE_ROLE_KEY'],
      'Authorization': `Bearer ${env['SUPABASE_SERVICE_ROLE_KEY']}`
    }
  });
  const data = await res.json();
  const paths = Object.keys(data.paths || {});
  console.log("All exposed REST/RPC paths in Supabase:");
  paths.forEach(p => console.log(p));
  
  const definitions = Object.keys(data.definitions || {});
  console.log("\nAll table definitions:");
  definitions.forEach(d => console.log(d));
}

getOpenApi().catch(console.error);
