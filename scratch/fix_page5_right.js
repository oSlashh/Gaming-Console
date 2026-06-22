const fs = require('fs');
const path = 'c:/Users/ASUS/Gaming-Console/src/app/wavelength/wavelength.html';
let content = fs.readFileSync(path, 'utf8');

const oldSnippet = `                                    @if (currentPageIndex() === 4) {
                                    <div class="nb-right" id="nb-right-5">
                                        <div class="nb-right-header">
                                            <span class="nb-right-icon">📖</span>
                                            <div>
                                                <h2 class="nb-right-title">Cozy Volume 1</h2>
                                                <p class="nb-right-sub">Arcade Platform Complete</p>
                                            </div>
                                        </div>

                                        <!-- Caption underneath -->
                                        <p class="nb-chest-caption">Interactive: More chapters coming next.</p>\r
                                    </div>\r
                                    }`;

const newSnippet = `                                    @if (currentPageIndex() === 4) {
                                    <div class="nb-right" id="nb-right-5">
                                        <div class="nb-right-header">
                                            <span class="nb-right-icon">📖</span>
                                            <div>
                                                <h2 class="nb-right-title">Cozy Volume 1</h2>
                                                <p class="nb-right-sub">Arcade Platform Complete</p>
                                            </div>
                                        </div>

                                        <!-- Treasure chest art area -->
                                        <div class="nb-art-area">
                                            <div class="nb-chest-direct">
                                                <svg viewBox="0 0 140 120" class="nb-chest-svg">
                                                    <!-- Chest body -->
                                                    <rect x="10" y="55" width="120" height="58" rx="8" fill="#c8974f" stroke="#3e1f08" stroke-width="3"/>
                                                    <!-- Chest lid -->
                                                    <rect x="10" y="28" width="120" height="35" rx="8" fill="#d4a765" stroke="#3e1f08" stroke-width="3"/>
                                                    <!-- Metal band lid -->
                                                    <rect x="8" y="50" width="124" height="10" rx="2" fill="#8a6030" stroke="#3e1f08" stroke-width="1.5"/>
                                                    <!-- Metal band body -->
                                                    <rect x="8" y="80" width="124" height="8" rx="2" fill="#8a6030" stroke="#3e1f08" stroke-width="1.5"/>
                                                    <!-- Lock -->
                                                    <rect x="54" y="45" width="32" height="24" rx="5" fill="#ffd93d" stroke="#3e1f08" stroke-width="2"/>
                                                    <path d="M 62 45 L 62 36 A 8 8 0 0 1 78 36 L 78 45" fill="none" stroke="#3e1f08" stroke-width="2.5" stroke-linecap="round"/>
                                                    <!-- Coins spilling -->
                                                    <circle cx="35" cy="30" r="10" fill="#ffd93d" stroke="#b48507" stroke-width="1.5"/>
                                                    <circle cx="55" cy="22" r="9" fill="#ffd93d" stroke="#b48507" stroke-width="1.5"/>
                                                    <circle cx="75" cy="18" r="11" fill="#ffd93d" stroke="#b48507" stroke-width="1.5"/>
                                                    <circle cx="95" cy="23" r="8" fill="#ffd93d" stroke="#b48507" stroke-width="1.5"/>
                                                    <circle cx="110" cy="32" r="9" fill="#ffd93d" stroke="#b48507" stroke-width="1.5"/>
                                                    <!-- Stars -->
                                                    <text x="26" y="8" font-size="12" fill="#ffd93d" opacity="0.8">✦</text>
                                                    <text x="100" y="12" font-size="10" fill="#ffd93d" opacity="0.7">✦</text>
                                                </svg>
                                            </div>
                                        </div>

                                        <!-- Caption underneath -->
                                        <p class="nb-chest-caption">Volume 1 complete! More chapters coming next.</p>

                                        <!-- Pink thank you sticky -->
                                        <div class="nb-sticky nb-sticky--pink footer-sticky">
                                            <strong>Thank you</strong> for playing Party Games! 🎉 Stay tuned for Volume 2.
                                        </div>
                                    </div>
                                    }`;

if (content.includes(oldSnippet)) {
    content = content.replace(oldSnippet, newSnippet);
    fs.writeFileSync(path, content);
    console.log("SUCCESS: Page 5 right panel updated");
} else {
    // Try without \r
    const oldSnippet2 = oldSnippet.replace(/\\\r/g, '');
    if (content.includes(oldSnippet2)) {
        content = content.replace(oldSnippet2, newSnippet);
        fs.writeFileSync(path, content);
        console.log("SUCCESS (no \\r): Page 5 right panel updated");
    } else {
        // Search for the key phrase and print surrounding context
        const idx = content.indexOf('Interactive: More chapters coming next.');
        if (idx >= 0) {
            console.log("Found the old text at index", idx);
            console.log("Context:\n", JSON.stringify(content.slice(idx - 100, idx + 200)));
        } else {
            console.log("COULD NOT FIND the target text");
        }
    }
}
