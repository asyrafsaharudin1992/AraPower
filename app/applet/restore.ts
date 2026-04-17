import { execSync } from 'child_process';
import * as fs from 'fs';
try {
  const result = execSync('git checkout HEAD -- src/App.tsx');
  console.log(result.toString());
} catch(e) {
  console.log(e.toString());
}
