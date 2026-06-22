const fs = require('fs');
const cssPath = 'c:/Users/ASUS/Gaming-Console/src/app/wavelength/wavelength.css';
const content = fs.readFileSync(cssPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('notebook-cover-closed')) {
    console.log(`Line ${idx + 1}: ${line}`);
    // print some context
    for (let i = Math.max(0, idx - 2); i <= Math.min(lines.length - 1, idx + 10); i++) {
      console.log(`  [${i + 1}] ${lines[i]}`);
    }
  }
});
