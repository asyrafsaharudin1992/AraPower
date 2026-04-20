import fetch from 'node-fetch';

async function test() {
  const url = 'http://127.0.0.1:3000/api/staff';
  const res = await fetch(url);
  const data = await res.json();
  const testuser = data.find(s => s.name === "Test Ambassador");
  console.log(testuser);
}
test();
