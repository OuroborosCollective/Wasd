const fs = require('fs');
const path = require('path');

function validatePackageManager() {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
        throw new Error('Required file package.json not found in root directory.');
    }

    let packageJson;
    try {
        const content = fs.readFileSync(packageJsonPath, 'utf8');
        packageJson = JSON.parse(content);
    } catch (err) {
        throw new Error('Failed to parse package.json: ' + err.message);
    }

    const packageManager = packageJson.packageManager;

    if (!packageManager) {
        throw new Error("The field 'packageManager' is missing in package.json.");
    }

    const regex = /^pnpm@(\d+\.\d+\.\d+)$/;
    const match = packageManager.match(regex);

    if (!match) {
        throw new Error(`Invalid packageManager format: "${packageManager}". Expected format is "pnpm@x.y.z".`);
    }

    return match[1];
}

module.exports = { validatePackageManager };