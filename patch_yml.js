const fs = require('fs');
let yml = fs.readFileSync('.github/workflows/are-tests.yml', 'utf8');

yml = yml.replace(/cache: "npm"/, 'cache: "pnpm"');

// Need to setup pnpm action first
const pnpmSetup = `      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node`;
yml = yml.replace(/      - name: Setup Node/, pnpmSetup);

yml = yml.replace(/      - name: Install dependencies\n        run: npm ci\n\n      - name: Install client dependencies\n        run: npm ci --prefix client\n\n      - name: Install server dependencies\n        run: npm ci --prefix server/, '      - name: Install dependencies\n        run: pnpm install --frozen-lockfile');

yml = yml.replace(/npm run build/g, 'pnpm -w run build');
yml = yml.replace(/npx vitest run/g, 'pnpm -w run test'); // Assuming vitest can be run via test script, or just use npx but make sure to use pnpm for others if needed.

// Actually npx vitest run is fine, let's leave npx vitest run.
yml = yml.replace(/pnpm -w run test server\/src\/tests\/runtime-settings-store\.test\.ts client\/src\/engine\/babylon\/BabylonAdapter\.test\.ts/g, 'npx vitest run server/src/tests/runtime-settings-store.test.ts client/src/engine/babylon/BabylonAdapter.test.ts');


fs.writeFileSync('.github/workflows/are-tests.yml', yml);
