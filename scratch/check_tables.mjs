import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, "");
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const candidateTables = [
  "profiles",
  "wallets",
  "daily_expenses",
  "expense_transfers",
  "edit_expense_requests",
  "fund_requests",
  "notifications",
  "cpl_daily_expenses",
  "cpl_expense_transfers",
  "marketing_systems",
  "settings",
  "system_settings"
];

async function checkTables() {
  for (const t of candidateTables) {
    const { data, error } = await supabase.from(t).select("*").limit(1);
    if (!error) {
      console.log(`Table '${t}' EXISTS! Sample:`, data);
    } else {
      console.log(`Table '${t}' NOT FOUND:`, error.message);
    }
  }
}

checkTables().catch(console.error);
