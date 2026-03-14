async function test() {
  const response = await fetch('http://localhost:3000/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: null,
      title: 'Test',
      message: 'Test message',
      type: 'announcement'
    })
  });
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Data:', data);
}
test();
