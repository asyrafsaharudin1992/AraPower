import fetch from 'node-fetch';
fetch('http://localhost:3000/api/staff/email?email=admin@clinic.com&auth_id=e17a572a-5436-435e-97ef-3719d27f05b9')
  .then(res => res.text())
  .then(text => console.log('Response:', text))
  .catch(err => console.error('Error:', err));
