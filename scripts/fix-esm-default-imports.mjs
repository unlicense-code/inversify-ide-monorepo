#!/usr/bin/env node
/**
 * Fix ESM default imports for CommonJS modules
 * Changes imports like:
 *   import * as module from 'module' -> import module from 'module'
 * For known CommonJS modules that export defaults
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { Project } from 'ts-morph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..');
const packagesDir = join(workspaceRoot, 'packages');
const devPackagesDir = join(workspaceRoot, 'dev-packages');

// Modules that need default imports
const defaultImportModules = [
    'decompress',
    'yargs',
    'markdown-it',
    'express',
    'sinon',
    'chai-spies',
    'bent',
    'nano'
];

function getAllTsFiles(dir, fileList = []) {
    if (!existsSync(dir)) {
        return fileList;
    }
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
const tsFiles = [
    ...getAllTsFiles(packagesDir),
    ...getAllTsFiles(devPackagesDir)
];
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

console.log('\nStep 2: Fixing default imports...');
let fixedCount = 0;
let filesModified = 0;
const fixedFiles = [];

for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath();
    if (!filePath.includes(packagesDir.replace(/\\/g, '/')) &&
        !filePath.includes(devPackagesDir.replace(/\\/g, '/'))) {
        continue;
    }

    let fileModified = false;
    const imports = sourceFile.getImportDeclarations();

    for (const importDecl of imports) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();

        // Check if this is a namespace import of a module that needs default import
        if (importDecl.getNamespaceImport() && defaultImportModules.some(m => moduleSpecifier === m)) {
            const namespaceImport = importDecl.getNamespaceImport();
            if (namespaceImport) {
                // Change to default import
                importDecl.removeNamespaceImport();
                importDecl.setDefaultImport(namespaceImport.getText());
                fixedCount++;
                fileModified = true;
                console.log(`  Fixed: ${relative(workspaceRoot, filePath)}`);
                console.log(`    import * as ${namespaceImport.getText()} from '${moduleSpecifier}' -> import ${namespaceImport.getText()} from '${moduleSpecifier}'`);
            }
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
    for (const file of fixedFiles) {
        console.log(`  ${relative(workspaceRoot, file)}`);
    }
}

console.log('\nDone!');
