#!/usr/bin/env node
/**
 * Fix imports that reference directories without /index.js
 * Changes imports like:
 *   from '../../common.js' -> from '../../common/index.js'
 *   from '../browser.js' -> from '../browser/index.js'
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { Project } from 'ts-morph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..');
const packagesDir = join(workspaceRoot, 'packages');

console.log('='.repeat(80));
console.log('Directory Import Fixer');
console.log('='.repeat(80));
console.log(`Workspace root: ${workspaceRoot}`);
console.log('');

// Common directories that should use /index.js
const commonDirs = ['common', 'browser', 'node', 'electron-browser', 'electron-main', 'electron-node', 'electron-common', 'electron-shared', 'shared', 'messaging', 'preferences', 'widgets', 'shell', 'tree'];

function getAllTsFiles(dir, fileList = []) {
    const files = readdirSync(dir);
    for (const file of files) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);
        if (stat.isDirectory()) {
            if (!['node_modules', 'lib', 'dist', '.git', 'coverage', 'src-gen'].includes(file)) {
                getAllTsFiles(filePath, fileList);
            }
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
});

console.log('Step 1: Loading TypeScript files...');
const tsFiles = getAllTsFiles(packagesDir);
console.log(`Found ${tsFiles.length} TypeScript files`);

let addedCount = 0;
for (const filePath of tsFiles) {
    try {
        project.addSourceFileAtPath(filePath);
        addedCount++;
    } catch (error) {
        // Skip
    }
}
console.log(`Added ${addedCount} files to project`);

console.log('\nStep 2: Fixing directory imports...');
let fixedCount = 0;
let filesModified = 0;
const fixedFiles = [];

function isDirectory(filePath, importPath) {
    const fileDir = dirname(filePath);
    const resolvedPath = join(fileDir, importPath);

    if (existsSync(resolvedPath)) {
        const stat = statSync(resolvedPath);
        return stat.isDirectory();
    }

    // Try without .js extension
    if (importPath.endsWith('.js')) {
        const withoutJs = importPath.slice(0, -3);
        const tryPath = join(fileDir, withoutJs);
        if (existsSync(tryPath)) {
            const stat = statSync(tryPath);
            return stat.isDirectory();
        }
    }

    return false;
}

function checkIfNeedsIndex(filePath, importPath) {
    const fileDir = dirname(filePath);

    // Remove .js extension if present
    const withoutJs = importPath.endsWith('.js') ? importPath.slice(0, -3) : importPath;
    const resolvedPath = join(fileDir, withoutJs);

    if (existsSync(resolvedPath)) {
        const stat = statSync(resolvedPath);
        if (stat.isDirectory()) {
            // Check if index.ts exists
            const indexTs = join(resolvedPath, 'index.ts');
            if (existsSync(indexTs)) {
                return true; // Needs /index.js
            }
        }
    }

    return false;
}

for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath();
    if (!filePath.includes(packagesDir.replace(/\\/g, '/'))) {
        continue;
    }

    let fileModified = false;
    const imports = sourceFile.getImportDeclarations();

    for (const importDecl of imports) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();

        // Only process relative imports
        if (!moduleSpecifier.startsWith('./') && !moduleSpecifier.startsWith('../')) {
            continue;
        }

        // Skip if already has /index.js
        if (moduleSpecifier.includes('/index.js')) {
            continue;
        }

        // Check if this is a directory that needs /index.js
        if (checkIfNeedsIndex(filePath, moduleSpecifier)) {
            const withoutJs = moduleSpecifier.endsWith('.js') ? moduleSpecifier.slice(0, -3) : moduleSpecifier;
            const newSpecifier = withoutJs + '/index.js';
            importDecl.setModuleSpecifier(newSpecifier);
            fixedCount++;
            fileModified = true;
            console.log(`  Fixed: ${relative(workspaceRoot, filePath)}`);
            console.log(`    ${moduleSpecifier} -> ${newSpecifier}`);
        }
    }

    if (fileModified) {
        filesModified++;
        fixedFiles.push(filePath);
    }
}

console.log('\nStep 3: Saving changes...');
project.saveSync();
console.log(`  Fixed ${fixedCount} imports in ${filesModified} files`);

console.log('\n' + '='.repeat(80));
console.log('Summary');
console.log('='.repeat(80));
console.log(`Total TypeScript files: ${tsFiles.length}`);
console.log(`Imports fixed: ${fixedCount}`);
console.log(`Files modified: ${filesModified}`);

if (fixedFiles.length > 0 && fixedFiles.length <= 30) {
    console.log('\nModified files:');
    for (const file of fixedFiles.slice(0, 30)) {
        console.log(`  ${relative(workspaceRoot, file)}`);
    }
    if (fixedFiles.length > 30) {
        console.log(`  ... and ${fixedFiles.length - 30} more`);
    }
}

console.log('\nDone!');
