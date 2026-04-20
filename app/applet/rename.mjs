import fs from "fs";

function processFile(path) {
    if (!fs.existsSync(path)) return;
    let c = fs.readFileSync(path, { encoding: 'utf8' });
    c = c.replace(/\/api\/referrals/g, '/api/patient-records');
    c = c.replace(/\/api\/payouts/g, '/api/settlements');
    fs.writeFileSync(path, c, { encoding: 'utf8' });
    console.log('Done ' + path);
}

processFile('server.ts');
processFile('src/App.tsx');
processFile('src/components/PublicBookingUI.tsx');
