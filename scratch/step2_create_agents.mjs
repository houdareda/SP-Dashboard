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

const agentsToCreate = [
  { name: 'Amgad Emad', email: 'Amgademad21@gmail.com' },
  { name: 'Ramy Rezk', email: 'ramyrizk36@gmail.com' },
  { name: 'Bishoy Farid', email: 'pishofarid1000@gmail.com' },
  { name: 'Bishoy Yousry', email: 'Beshoy.y.mouzad@gmail.com' },
  { name: 'Marco Abdo', email: 'marcoabdo8@gmail.com' },
  { name: 'Michael Waheeb', email: 'michael.waheeb7@gmail.com' },
  { name: 'Andrew Nasser', email: 'Andrew.nlouis001@gmail.com' },
  { name: 'Bishoy Samy', email: 'beshoy.fhmy95@gmail.com' },
  { name: 'Maged Emad', email: 'magedmichael495@gmail.com' },
  { name: 'Mario Magdy', email: 'mariootadrous@gmail.com' },
  { name: 'Abanob Essa', email: 'beeboophy@gmail.com' },
  { name: 'Abanoub Morgan', email: 'ttota4787@gmail.com' },
  { name: 'Beshoy Medhat', email: 'Bishomedhat00@gmail.com' },
  { name: 'Peter Abdo', email: 'gamilpeter93@gmail.com' },
  { name: 'Samer Gamal', email: 'erog5117@gmail.com' },
  { name: 'Abanob Moner', email: 'abanop.munir@gmail.com' },
  { name: 'Andrew Issac', email: 'androisaac50@gmail.com' },
  { name: 'Bishoy Talaat', email: 'beshoytalaat5525@gmail.com' },
  { name: 'George Azize', email: 'gogooog5558@gmail.com' },
  { name: 'Kirillos William', email: 'Kerowilliam1999@gmail.com' },
  { name: 'Bishoy Fawzy', email: 'beshoyfawzy49@gmail.com' },
  { name: 'Mina Nader', email: 'Mina.nader111@gmail.com' },
  { name: 'Armia Talaat', email: 'armiatalaat3@gmail.com' },
  { name: 'Kirillos Ragheb', email: 'kiroraghep1@gmail.com' },
  { name: 'Thomas Throat', email: 'thomas.throat10@gmail.com' },
  { name: 'Mark George', email: 'mark.george10@gmail.com' },
];

async function createAllAgents() {
  console.log(`--- Creating ${agentsToCreate.length} agent accounts ---`);
  const agentMap = {}; // normalize(name) -> { id, name, email }

  for (const agent of agentsToCreate) {
    const password = agent.email.trim(); // password is the email!
    console.log(`Creating: ${agent.name} (${agent.email})...`);

    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: agent.email.trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: agent.name,
      }
    });

    if (authErr) {
      console.error(`  Error creating auth user ${agent.email}:`, authErr.message);
      continue;
    }

    const userId = authUser.user.id;

    // Ensure profiles record exists and has correct full_name, role, is_active
    const { error: profErr } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: agent.email.trim(),
        full_name: agent.name,
        role: 'agent',
        is_active: true,
        sheet_urls: {},
      });

    if (profErr) {
      console.error(`  Error upserting profile for ${agent.name}:`, profErr.message);
    } else {
      console.log(`  ✓ Success: ${agent.name} -> ID: ${userId}`);
    }

    agentMap[agent.name.toLowerCase().replace(/\s+/g, ' ').trim()] = {
      id: userId,
      name: agent.name,
      email: agent.email,
    };
  }

  // Save mapping to file
  fs.writeFileSync(path.resolve('scratch/agents_map.json'), JSON.stringify(agentMap, null, 2));
  console.log('\n✓ Saved agents_map.json with', Object.keys(agentMap).length, 'agents.');
}

createAllAgents();
