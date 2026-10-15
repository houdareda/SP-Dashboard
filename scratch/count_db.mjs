import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, "");
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { count: expCount } = await supabase.from("daily_expenses").select("*", { count: "exact", head: true });
  const { count: profCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
  const { count: reqCount } = await supabase.from("edit_expense_requests").select("*", { count: "exact", head: true });
  console.log("daily_expenses count:", expCount);
  console.log("profiles count:", profCount);
  console.log("edit_expense_requests count:", reqCount);
}

check().catch(console.error);
