const fs = require('fs');
const cssPath = 'c:/Users/ASUS/Gaming-Console/src/app/wavelength/wavelength.css';
const content = fs.readFileSync(cssPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('notebook-flag') || line.includes('flag--')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
