#!/usr/bin/env node
/**
 * Merge all package specific TypeDoc docs json files into a unified HTML site.
 */

import { readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const rootDir = process.cwd();

function getTheiaVersion() {
    const packageJsonPath = join(rootDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    // Try to get version from a workspace package, or use root version
    try {
        const workspaces = JSON.parse(execSync('node scripts/get-workspaces.mjs --json', { cwd: rootDir, encoding: 'utf8' }));
        if (workspaces.length > 0) {
            // Get version from @theia/core if available, otherwise first package
            const corePkg = workspaces.find(p => p.name === '@theia/core') || workspaces[0];
            return corePkg.version || packageJson.version || '0.0.0';
        }
    } catch (e) {
        // Fallback to package.json version
    }
    return packageJson.version || '0.0.0';
}

function main() {
    const start = Date.now();
    console.log('\nMerging all package docs into a unified site...');
    const args = [
        'npx typedoc',
        '--options', './configs/merge.typedoc.json',
        '--name', `"Theia API Documentation v${getTheiaVersion()}"`
    ];

    execSync(args.join(' '), { cwd: rootDir, stdio: 'inherit' });
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✅ Documentation generation complete in ${duration}s`);

    // Cleanup: Remove the gh-pages/packages directory after merge as we do not want to publish those files
    const packagesDir = join(rootDir, 'gh-pages', 'packages');
    if (existsSync(packagesDir)) {
        console.log('\nCleaning up gh-pages/packages...');
        rmSync(packagesDir, { recursive: true, force: true });
        console.log('✅ Cleanup complete');
    }
}

main();
