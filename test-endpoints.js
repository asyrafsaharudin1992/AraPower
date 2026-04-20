import fetch from 'node-fetch';

async function run() {
  const settings = await fetch('http://localhost:3000/api/settings').then(r => r.text());
  console.log("Settings:", settings);
  
  const staff = await fetch('http://localhost:3000/api/staff').then(r => r.text());
  console.log("Staff:", staff);
}
run();
