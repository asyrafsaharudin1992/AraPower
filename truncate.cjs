const fs = require('fs');
const content = fs.readFileSync('src/components/ReferralBoard.tsx', 'utf-8');
const lines = content.split('\n');
const newContent = lines.slice(0, 365).join('\n') + '\n};\nexport default ReferralBoard;\n';
fs.writeFileSync('src/components/ReferralBoard.tsx', newContent);
