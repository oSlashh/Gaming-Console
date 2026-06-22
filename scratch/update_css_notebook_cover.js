const fs = require('fs');
const cssPath = 'c:/Users/ASUS/Gaming-Console/src/app/wavelength/wavelength.css';
let content = fs.readFileSync(cssPath, 'utf8');

const targetStr = `.notebook-cover-closed {
    position: relative;
    width: 40vw;
    max-width: 575px;
    height: 82vh;
    min-height: 660px;
    transform: rotate(-1.2deg);
    margin: auto; /* Perfectly centered both horizontally and vertically inside flex container */
    align-self: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 30px;`;

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = targetStr.replace(/\r\n/g, '\n');

const replacementStr = `.notebook-cover-closed {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 30px;`;

if (!normalizedContent.includes(normalizedTarget)) {
    console.error("Target string not found in normalized content!");
    process.exit(1);
}

const updatedContent = normalizedContent.replace(normalizedTarget, replacementStr);
// Save back with CRLF line endings
fs.writeFileSync(cssPath, updatedContent.replace(/\n/g, '\r\n'), 'utf8');
console.log("Successfully normalized .notebook-cover-closed in wavelength.css!");
