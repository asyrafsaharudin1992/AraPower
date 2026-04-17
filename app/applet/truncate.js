const fs = require('fs');
const lines = fs.readFileSync('src/components/ReferralBoard.tsx', 'utf-8').split('\n');
fs.writeFileSync('src/components/ReferralBoard.tsx', lines.slice(0, 365).join('\n') + '\n};\nexport default ReferralBoard;');
