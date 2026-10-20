import xlsx from 'xlsx';
import path from 'path';

const userAgents = [
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
];

const filePath = path.resolve('Untitled spreadsheet.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json(sheet);

const sheetAgents = new Set();
rows.forEach(r => {
  if (r['Agent Name']) sheetAgents.add(String(r['Agent Name']).trim());
});

console.log('User provided agents count:', userAgents.length);
console.log('Sheet unique agents count:', sheetAgents.size);

const normalize = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();

const userAgentMap = new Map();
userAgents.forEach(u => userAgentMap.set(normalize(u.name), u));

const matched = [];
const unmatchedInSheet = [];

Array.from(sheetAgents).forEach(sa => {
  const norm = normalize(sa);
  if (userAgentMap.has(norm)) {
    matched.push({ sheet: sa, user: userAgentMap.get(norm).name });
  } else {
    unmatchedInSheet.push(sa);
  }
});

console.log('\nMatched agents (' + matched.length + '):');
matched.forEach(m => console.log(`  "${m.sheet}" -> "${m.user}"`));

console.log('\nUnmatched agents in sheet (' + unmatchedInSheet.length + '):');
unmatchedInSheet.forEach(u => console.log(`  "${u}"`));

const matchedNorms = new Set(matched.map(m => normalize(m.user)));
const unmatchedInUser = userAgents.filter(u => !matchedNorms.has(normalize(u.name)));
console.log('\nUnmatched agents from user list (' + unmatchedInUser.length + '):');
unmatchedInUser.forEach(u => console.log(`  "${u.name}"`));
