#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Try to load from compiled lib first
const libPath = path.join(__dirname, '../lib/theia');
const srcPath = path.join(__dirname, '../src/theia.ts');

if (fs.existsSync(libPath + '.js')) {
    require(libPath);
} else if (fs.existsSync(srcPath)) {
    // Try to compile on demand
    try {
        const cliPackagePath = path.join(__dirname, '..');
        console.log('CLI not compiled. Compiling...');
        execSync('npm run compile', { cwd: cliPackagePath, stdio: 'inherit' });
        if (fs.existsSync(libPath + '.js')) {
            require(libPath);
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
