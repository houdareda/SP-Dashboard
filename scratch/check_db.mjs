import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Read .env.local manually
const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) {
    env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("Checking daily_expenses sample...");
  const { data: exp, error: expErr } = await supabase.from("daily_expenses").select("*").limit(1);
  if (expErr) console.error("Error daily_expenses:", expErr);
  else console.log("daily_expenses fields:", exp && exp[0] ? Object.keys(exp[0]) : "table empty");

  console.log("Checking profiles sample...");
  const { data: prof, error: profErr } = await supabase.from("profiles").select("*").limit(1);
  if (profErr) console.error("Error profiles:", profErr);
  else console.log("profiles fields:", prof && prof[0] ? Object.keys(prof[0]) : "table empty");

  console.log("Checking edit_expense_requests sample...");
  const { data: ed, error: edErr } = await supabase.from("edit_expense_requests").select("*").limit(1);
  if (edErr) console.error("Error edit_expense_requests:", edErr);
  else console.log("edit_expense_requests fields:", ed && ed[0] ? Object.keys(ed[0]) : "table empty");
}

main().catch(console.error);
