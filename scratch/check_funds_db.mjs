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

async function checkFundsInDb() {
  const { data: funds } = await supabase
    .from('fund_requests')
    .select('amount_requested, amount_approved, status');

  let approvedCount = 0;
  let rejectedCount = 0;
  let diffCount = 0;
  let approvedSum = 0;
  let requestedSum = 0;

  funds?.forEach(f => {
    if (f.status === 'approved') {
      approvedCount++;
      approvedSum += Number(f.amount_approved) || 0;
      requestedSum += Number(f.amount_requested) || 0;
      if (Number(f.amount_requested) !== Number(f.amount_approved)) {
        diffCount++;
      }
    } else {
      rejectedCount++;
    }
  });

  console.log('Total fund requests in DB:', funds?.length);
  console.log('Approved count:', approvedCount);
  console.log('Rejected count:', rejectedCount);
  console.log('Approved where requested !== approved (different amount):', diffCount);
  console.log('Total Requested Amount Sum (for approved):', requestedSum.toLocaleString('en-US'));
  console.log('Total Approved Amount Sum (actual transferred):', approvedSum.toLocaleString('en-US'));
}

checkFundsInDb();
