const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const CONFIG = {
    targetDirs: ['src/backend', 'src/client', 'config'],
    cacheFile: path.join(process.cwd(), '.audit-cache.json'),
    timeWindowMs: 48 * 60 * 60 * 1000,
    extensions: ['.ts', '.js', '.tsx', '.jsx']
};

function getFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
}

function loadCache() {
    if (fs.existsSync(CONFIG.cacheFile)) {
        try {
            return JSON.parse(fs.readFileSync(CONFIG.cacheFile, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

function saveCache(cache) {
    fs.writeFileSync(CONFIG.cacheFile, JSON.stringify(cache, null, 2));
}

function isModifiedRecently(filePath) {
    const stats = fs.statSync(filePath);
    const now = Date.now();
    return (now - stats.mtimeMs) < CONFIG.timeWindowMs;
}

function runLinter(filePath) {
    try {
        execSync(`npx eslint "${filePath}" --fix`, { stdio: 'inherit' });
        return true;
    } catch (error) {
        return false;
    }
}

function runStaticAnalysis(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return true;
    try {
        execSync(`npx tsc "${filePath}" --noEmit --esModuleInterop --skipLibCheck --target esnext`, { stdio: 'ignore' });
        return true;
    } catch (error) {
        return false;
    }
}

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllFiles(filePath, fileList);
        } else {
            if (CONFIG.extensions.includes(path.extname(filePath))) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

function audit() {
    let iterationCount = 0;
    let cache = loadCache();

    while (true) {
        iterationCount++;
        let issueFixed = false;
        const allFiles = CONFIG.targetDirs
            .filter(dir => fs.existsSync(path.join(process.cwd(), dir)))
            .flatMap(dir => getAllFiles(path.join(process.cwd(), dir)));

        for (const file of allFiles) {
            const currentHash = getFileHash(file);
            const cachedData = cache[file];
            const recentlyModified = isModifiedRecently(file);

            if (!cachedData || cachedData.hash !== currentHash || recentlyModified) {
                let lintPassed = runLinter(file);
                let tsPassed = runStaticAnalysis(file);

                if (!lintPassed || !tsPassed) {
                    // Start Fix Routine
                    try {
                        execSync(`npx eslint "${file}" --fix`, { stdio: 'inherit' });
                        // Re-check after fix attempt
                        if (!runStaticAnalysis(file)) {
                            // If still failing, manual intervention or complex fix logic would go here
                            // For Ouroboros logic: mark as fixed/changed and restart
                        }
                        issueFixed = true;
                    } catch (e) {
                        issueFixed = true;
                    }
                }

                cache[file] = {
                    hash: getFileHash(file),
                    lastAudit: Date.now()
                };

                if (issueFixed) {
                    saveCache(cache);
                    break; // Restart Ouroboros-Loop
                }
            }
        }

        if (!issueFixed) {
            saveCache(cache);
            break; 
        }
    }
}

audit();