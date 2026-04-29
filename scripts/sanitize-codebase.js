const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = process.cwd();

function walkSync(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
                walkSync(filepath, callback);
            }
        } else {
            callback(filepath);
        }
    });
}

function sanitizeCodebase() {
    console.log('Starting sanitization process...');

    walkSync(rootDir, (filepath) => {
        const filename = path.basename(filepath);
        if (filename === 'google-services.json' || filename === 'GoogleService-Info.plist') {
            console.log(`Deleting: ${filepath}`);
            fs.unlinkSync(filepath);
        }
    });

    const pkgPath = path.join(rootDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
        console.log('Cleaning package.json dependencies...');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

        const cleanDeps = (deps) => {
            if (!deps) return {};
            return Object.fromEntries(
                Object.entries(deps).filter(([key]) => {
                    const isFirebase = key.toLowerCase().includes('firebase');
                    const isDrm = key.toLowerCase().includes('drm');
                    return !isFirebase && !isDrm;
                })
            );
        };

        pkg.dependencies = cleanDeps(pkg.dependencies);
        pkg.devDependencies = cleanDeps(pkg.devDependencies);
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    }

    const firebaseImportRegex = /import\s+.*\s+from\s+['"]firebase\/.*['"];?\n?/g;
    const firebaseInitRegex = /firebase\.initializeApp\(.*?\);?/gs;

    walkSync(rootDir, (filepath) => {
        const ext = path.extname(filepath);
        if (['.js', '.ts', '.jsx', '.tsx', '.mjs'].includes(ext)) {
            let content = fs.readFileSync(filepath, 'utf8');
            let modified = false;

            if (firebaseImportRegex.test(content)) {
                content = content.replace(firebaseImportRegex, '');
                modified = true;
            }
            if (firebaseInitRegex.test(content)) {
                content = content.replace(firebaseInitRegex, '');
                modified = true;
            }

            if (modified) {
                console.log(`Cleaned Firebase code from: ${filepath}`);
                fs.writeFileSync(filepath, content);
            }
        }
    });

    console.log('Executing environment cleanup and npm commands...');
    try {
        const isWindows = process.platform === 'win32';
        const rmCmd = isWindows ? 'rmdir /s /q node_modules && del package-lock.json' : 'rm -rf node_modules package-lock.json';
        
        execSync(rmCmd, { stdio: 'inherit', shell: true });
        execSync('npm install', { stdio: 'inherit' });
        execSync('npm update', { stdio: 'inherit' });
        execSync('npm audit fix --force', { stdio: 'inherit' });
    } catch (error) {
        console.error('Error executing shell commands:', error.message);
    }

    if (fs.existsSync(pkgPath)) {
        console.log('Performing Peer-Dependency check...');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const nodeModulesPath = path.join(rootDir, 'node_modules');
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        let peersAdded = false;

        Object.keys(allDeps).forEach((depName) => {
            const depPkgPath = path.join(nodeModulesPath, depName, 'package.json');
            if (fs.existsSync(depPkgPath)) {
                const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
                if (depPkg.peerDependencies) {
                    Object.entries(depPkg.peerDependencies).forEach(([peerName, peerVersion]) => {
                        if (!pkg.dependencies[peerName] && !pkg.devDependencies[peerName]) {
                            console.log(`Adding missing peer dependency: ${peerName}@${peerVersion}`);
                            pkg.dependencies[peerName] = peerVersion;
                            peersAdded = true;
                        }
                    });
                }
            }
        });

        if (peersAdded) {
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
            console.log('Re-installing with new peer dependencies...');
            execSync('npm install', { stdio: 'inherit' });
        }
    }

    console.log('Sanitization complete.');
}

sanitizeCodebase();