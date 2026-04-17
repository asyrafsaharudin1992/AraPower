const fs = require('fs');
const content = fs.readFileSync('/app/applet/src/components/ReferralBoard.tsx', 'utf-8');
const lines = content.split('\n');
const newContent = lines.slice(0, 365).join('\n') + '\n};\nexport default ReferralBoard;';
fs.writeFileSync('/app/applet/src/components/ReferralBoard.tsx', newContent);
