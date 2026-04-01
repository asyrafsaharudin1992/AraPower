import fetch from 'node-fetch';

async function test() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'asyrafsaharudin@gmail.com', password: 'anypassword' })
  });
  console.log(res.status);
  console.log(await res.json());
}
test();
