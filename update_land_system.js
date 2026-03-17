const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server/src/modules/land/LandSystem.ts');
let code = fs.readFileSync(filePath, 'utf8');

// Replace everything inside async init() { ... // Load all lands
const regex = /async init\(\) \{[\s\S]*?\/\/ Load all lands/;
const replacement = `async init() {\n    // Load all lands`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync(filePath, code);
  console.log("Successfully updated LandSystem.ts");
} else {
  console.log("Regex didn't match!");
}
