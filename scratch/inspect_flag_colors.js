const fs = require('fs');
const cssPath = 'c:/Users/ASUS/Gaming-Console/src/app/wavelength/wavelength.css';
const content = fs.readFileSync(cssPath, 'utf8');

// Look for all flag-related selectors
const lines = content.split('\n');
const flagLines = [];
lines.forEach((line, idx) => {
  if (line.match(/flag--(coral|sky|mint|lavender|yellow|pink|purple|blue)/)) {
    flagLines.push(`Line ${idx + 1}: ${line.trim()}`);
  }
});

if (flagLines.length === 0) {
  console.log("NO COLORED FLAG SELECTORS FOUND");
} else {
  flagLines.forEach(l => console.log(l));
}

// Also look for nb-sticky variants and nb-doodle and nb-watermark
const stickyLines = [];
lines.forEach((line, idx) => {
  if (line.match(/nb-sticky--|nb-doodle--|nb-watermark|nb-art-area|nb-stamp|nb-dash-list|nb-paperclip/)) {
    stickyLines.push(`Line ${idx + 1}: ${line.trim()}`);
  }
});
console.log("\n=== Sticky / Doodle / Art selectors ===");
if (stickyLines.length === 0) {
  console.log("NONE FOUND");
} else {
  stickyLines.forEach(l => console.log(l));
}
