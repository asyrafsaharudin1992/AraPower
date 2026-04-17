import * as fs from 'fs';

const code = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = code.split('\n');
const startIdx = lines.findIndex(l => l.includes('// Welcome / Onboarding Screen'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('if (showWelcome && currentUser) {'));

if (startIdx !== -1 && endIdx !== -1) {
    const newLines = [
        ...lines.slice(0, startIdx),
        '  // Welcome / Onboarding Screen',
        '  if (!currentUser) {',
        '    return (',
        '      <AuthUI ',
        '        onAuthSuccess={handleAuthSuccess}',
        '        clinicProfile={clinicProfile}',
        '        apiBaseUrl={apiBaseUrl}',
        '        branches={branches}',
        '        isSupabaseConfigured={isSupabaseConfigured}',
        '        Logo={Logo}',
        '      />',
        '    );',
        '  }',
        '',
        ...lines.slice(endIdx)
    ];
    fs.writeFileSync('src/App.tsx', newLines.join('\n'));
    console.log('Successfully replaced Auth UI block.');
} else {
    console.log('Could not find boundaries.', startIdx, endIdx);
}
