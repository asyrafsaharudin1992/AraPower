import http from 'http';

http.get('http://0.0.0.0:3000/api/payouts/summary', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
