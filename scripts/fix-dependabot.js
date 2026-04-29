const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DEPENDABOT_PATH = path.join(process.cwd(), '.github', 'dependabot.yml');
const ROOT_DIR = process.cwd();

function scanManifests() {
    const ecosystems = [];
    if (fs.existsSync(path.join(ROOT_DIR, 'package.json'))) ecosystems.push('npm');
    if (fs.existsSync(path.join(ROOT_DIR, 'requirements.txt'))) ecosystems.push('pip');
    if (fs.existsSync(path.join(ROOT_DIR, 'go.mod'))) ecosystems.push('gomod');
    if (fs.existsSync(path.join(ROOT_DIR, 'Gemfile'))) ecosystems.push('bundler');
    
    const workflowDir = path.join(ROOT_DIR, '.github', 'workflows');
    if (fs.existsSync(workflowDir)) {
        const files = fs.readdirSync(workflowDir);
        if (files.some(f => f.endsWith('.yml') || f.endsWith('.yaml'))) {
            ecosystems.push('github-actions');
        }
    }
    return ecosystems;
}

function fixDependabot() {
    const detectedEcosystems = scanManifests();
    
    if (!fs.existsSync(path.dirname(DEPENDABOT_PATH))) {
        fs.mkdirSync(path.dirname(DEPENDABOT_PATH), { recursive: true });
    }

    let config;
    try {
        if (fs.existsSync(DEPENDABOT_PATH)) {
            config = yaml.load(fs.readFileSync(DEPENDABOT_PATH, 'utf8'));
        } else {
            config = { version: 2, updates: [] };
        }
    } catch (e) {
        config = { version: 2, updates: [] };
    }

    if (!config || typeof config !== 'object') config = { version: 2, updates: [] };
    config.version = 2;
    if (!Array.isArray(config.updates)) config.updates = [];

    // Fallback logic: if updates are empty, initialize with detected ones
    if (config.updates.length === 0) {
        detectedEcosystems.forEach(eco => {
            config.updates.push({
                'package-ecosystem': eco,
                'directory': '/',
                'schedule': { 'interval': 'daily' }
            });
        });
    } else {
        config.updates = config.updates.map((update, index) => {
            if (!update['package-ecosystem'] || update['package-ecosystem'].trim() === '') {
                update['package-ecosystem'] = detectedEcosystems[index] || 'npm';
            }
            
            update.directory = '/';
            
            if (!update.schedule) {
                update.schedule = { interval: 'daily' };
            } else if (update.schedule.interval === 'hourly') {
                update.schedule.interval = 'daily';
            }
            
            return update;
        });
    }

    const outputYaml = yaml.dump(config, {
        indent: 2,
        styles: {
            '!!null': 'camelcase'
        },
        sortKeys: false
    });

    fs.writeFileSync(DEPENDABOT_PATH, outputYaml, 'utf8');
}

fixDependabot();