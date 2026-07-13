const { createClient } = require('c:/Users/Reda Tech/Desktop/Shift Point Dashboard/node_modules/@supabase/supabase-js');
const fs = require('fs');

const envPath = 'c:/Users/Reda Tech/Desktop/Shift Point Dashboard/.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function run() {
  console.log("Testing join on edit_expense_requests for reviewed_by...");
  const { data: data1, error: error1 } = await supabase
    .from('edit_expense_requests')
    .select(`
      *,
      reviewer:profiles!edit_expense_requests_reviewed_by_fkey(full_name)
    `)
    .limit(1);

  if (error1) {
    console.error("Test 1 failed:", error1.message);
  } else {
    console.log("Test 1 succeeded! Data:", data1);
  }

  console.log("\nTesting join on fund_requests for approved_by...");
  const { data: data2, error: error2 } = await supabase
    .from('fund_requests')
    .select(`
      *,
      reviewer:profiles!fund_requests_approved_by_fkey(full_name)
    `)
    .limit(1);

  if (error2) {
    console.error("Test 2 failed:", error2.message);
  } else {
    console.log("Test 2 succeeded! Data:", data2);
  }
}

run();
