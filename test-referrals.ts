import fetch from 'node-fetch';
fetch('http://localhost:3000/api/referrals?requesterRole=admin&requesterBranch=undefined')
  .then(res => res.text())
  .then(text => console.log('Response:', text.substring(0, 100)))
  .catch(err => console.error('Error:', err));
