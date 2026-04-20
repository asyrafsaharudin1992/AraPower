import fs from 'fs';

function replaceInFile(filepath: string) {
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf8');
  
  // replace /api/referrals
  content = content.replace(/\/api\/referrals/g, '/api/patient-records');
  
  // replace /api/payouts
  content = content.replace(/\/api\/payouts/g, '/api/settlements');

  fs.writeFileSync(filepath, content, 'utf8');
  console.log('Updated ' + filepath);
}

replaceInFile('server.ts');
replaceInFile('src/App.tsx');
replaceInFile('src/components/PublicBookingUI.tsx'); // just in case
