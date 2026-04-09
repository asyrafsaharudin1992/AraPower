import fetch from 'node-fetch';

async function test() {
  console.log('Testing /api/tasks');
  const res1 = await fetch('http://localhost:3000/api/tasks', {
    headers: { 'x-user-id': '1' }
  });
  console.log('Tasks Status:', res1.status);
  console.log('Tasks Data:', await res1.text());

  console.log('Testing /api/referrals');
  const res2 = await fetch('http://localhost:3000/api/referrals');
  console.log('Referrals Status:', res2.status);
  console.log('Referrals Data:', await res2.text());

  console.log('Testing /api/branch-change-requests');
  const res3 = await fetch('http://localhost:3000/api/branch-change-requests');
  console.log('Branch Change Requests Status:', res3.status);
  console.log('Branch Change Requests Data:', await res3.text());
}

test();
