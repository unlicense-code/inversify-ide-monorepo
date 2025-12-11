#!/usr/bin/env node
/**
 * Fix @theia/* package imports by adding .js extensions
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const import.meta.dirname = dirname(__filename);
const workspaceRoot = join(import.meta.dirname);
const packagesDir = join(workspaceRoot, 'packages');

function getAllFiles(dir, fileList = []) {
    const files = readdirSync(dir);

    for (const file of files) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
            // Skip node_modules and other build directories
            if (!['node_modules', 'lib', '.git', 'dist', 'out'].includes(file)) {
                getAllFiles(filePath, fileList);
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            fileList.push(filePath);
        }
    }

    return fileList;
}

function fixImports(content) {
    let modified = content;
    let changed = false;

    // Find all @theia imports - handle both single and double quotes
    const importRegex = /from\s+(['"])(@theia\/[^'"]+)\1/g;
    const matches = [...content.matchAll(importRegex)];

    for (const match of matches) {
        const quote = match[1];
        const importPath = match[2];

        // Skip if already has .js extension
        if (importPath.endsWith('.js')) {
            continue;
        }

        // Skip if it's just '@theia/core' or '@theia/package-name' (package root)
        if (!importPath.includes('/lib/') && !importPath.includes('/shared/') && !importPath.includes('/esm/')) {
            continue;
        }

        // Skip if it's a shared import that already has index.js
        if (importPath.includes('/shared/') && importPath.endsWith('/index.js')) {
            continue;
        }

        // Add .js extension
        const newImportPath = importPath + '.js';
        const oldPattern = `from ${quote}${importPath}${quote}`;
        const newPattern = `from ${quote}${newImportPath}${quote}`;

        // Escape special regex characters in the pattern
        const escapedOld = oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        modified = modified.replace(new RegExp(escapedOld, 'g'), newPattern);
        changed = true;
    }

    return { content: modified, changed };
}

// Get all TypeScript files
console.log('Finding TypeScript files...');
console.log(`Packages directory: ${packagesDir}`);
console.log(`Directory exists: ${statSync(packagesDir).isDirectory()}`);
const files = getAllFiles(packagesDir);
console.log(`Found ${files.length} files`);
if (files.length === 0) {
    console.log('No files found! Exiting.');
    process.exit(1);
}

let fixedFiles = 0;
let totalImports = 0;

for (const file of files) {
    try {
        const content = readFileSync(file, 'utf8');
        const { content: newContent, changed } = fixImports(content);

        if (changed) {
            writeFileSync(file, newContent, 'utf8');
            fixedFiles++;

            // Count how many imports were fixed
            const oldMatches = [...content.matchAll(/from\s+['"](@theia\/[^'"]+)['"]/g)];
            const newMatches = [...newContent.matchAll(/from\s+['"](@theia\/[^'"]+\.js)['"]/g)];
            const fixedCount = oldMatches.filter(m => !m[1].endsWith('.js')).length;
            totalImports += fixedCount;

            if (fixedCount > 0) {
                console.log(`Fixed ${fixedCount} import(s) in ${file.replace(workspaceRoot, '')}`);
            }
        }
    } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
    }
}

console.log(`\nFixed ${totalImports} imports in ${fixedFiles} files`);
