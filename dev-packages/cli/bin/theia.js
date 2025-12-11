#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load from compiled lib first
const libPath = join(__dirname, '../lib/theia.js');
const srcPath = join(__dirname, '../src/theia.ts');

if (existsSync(libPath)) {
    await import(pathToFileURL(libPath).href);
} else if (existsSync(srcPath)) {
    // Try to compile on demand
    try {
        const cliPackagePath = join(__dirname, '..');
        console.log('CLI not compiled. Compiling...');
        execSync('npm run compile', { cwd: cliPackagePath, stdio: 'inherit' });
        if (existsSync(libPath)) {
            await import(pathToFileURL(libPath).href);
        } else {
            throw new Error('Compilation failed');
        }
    } catch (e) {
        console.error('Error: CLI package not compiled and auto-compilation failed.');
        console.error('Please run: cd dev-packages/cli && npm run compile');
        console.error('Or run from root: npm run build:tools');
        process.exit(1);
    }
} else {
    console.error('Error: Cannot find CLI source or compiled files.');
    process.exit(1);
}
