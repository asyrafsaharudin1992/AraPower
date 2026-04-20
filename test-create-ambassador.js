import fetch from 'node-fetch';

async function test() {
  const rs = Math.random().toString(36).substring(7);
  const response = await fetch('http://localhost:3000/api/ambassador/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'Test Ambassador ' + rs, username: 'testamb+' + rs + '@local.test' })
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Body:', text);
}

test();
