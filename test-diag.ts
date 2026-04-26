
import fetch from 'node-fetch';
fetch('http://localhost:3000/api/diag')
  .then(res => res.text())
  .then(text => console.log('Diag Response:', text))
  .catch(err => console.error('Error:', err));
