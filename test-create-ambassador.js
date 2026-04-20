import fetch from 'node-fetch';

async function test() {
  const url = 'http://127.0.0.1:3000/api/ambassador/create';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'Test Ambassador', username: 'testamb@local.test' })
  });
  
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}
test();
