#!/usr/bin/env node
/**
 * Script to fix TypeScript "Cannot find module" errors after adding .js extensions
 * This handles cases where:
 * 1. Directory imports need /index.js
 * 2. File imports need correct paths
 * 3. Imports pointing to non-existent files
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, dirname, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { Project } from 'ts-morph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..');

console.log('='.repeat(80));
console.log('TypeScript Module Resolution Error Fixer');
console.log('='.repeat(80));
console.log(`Workspace root: ${workspaceRoot}`);
console.log('');

// Step 1: Run tsc to get errors
console.log('Step 1: Running TypeScript compiler to find errors...');
let tscOutput = '';
try {
    tscOutput = execSync('npx tsc --noEmit --pretty false', {
        cwd: workspaceRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });
} catch (error) {
    tscOutput = (error.stdout || error.stderr || '').toString();
}

// Parse "Cannot find module" errors
const moduleErrors = [];
const errorLines = tscOutput.split('\n');
for (const line of errorLines) {
    const match = line.match(/^(.+\.ts)\((\d+),(\d+)\):\s+error\s+TS2307:\s+Cannot find module ['"]([^'"]+)['"]/);
    if (match) {
        const [, filePath, lineNum, colNum, modulePath] = match;
        const fullPath = join(workspaceRoot, filePath);
        if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
            moduleErrors.push({
                file: fullPath,
                line: parseInt(lineNum),
                col: parseInt(colNum),
                modulePath
            });
        }
    }
}

console.log(`Found ${moduleErrors.length} module resolution errors`);
console.log('');

if (moduleErrors.length === 0) {
    console.log('No module errors found!');
    process.exit(0);
}

// Step 2: Group errors by file
const errorsByFile = new Map();
for (const error of moduleErrors) {
    if (!errorsByFile.has(error.file)) {
        errorsByFile.set(error.file, []);
    }
    errorsByFile.get(error.file).push(error);
}

console.log(`Step 2: Processing ${errorsByFile.size} files with errors...`);

// Initialize ts-morph project
const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
});

let fixedCount = 0;
const fixedFiles = [];

// Helper function to resolve module path
function resolveModulePath(filePath, modulePath) {
    const fileDir = dirname(filePath);
    const resolvedPath = join(fileDir, modulePath);

    // Check if it's a directory
    if (existsSync(resolvedPath)) {
        const stat = statSync(resolvedPath);
        if (stat.isDirectory()) {
            // Check for index.ts or index.js
            const indexTs = join(resolvedPath, 'index.ts');
            const indexJs = join(resolvedPath, 'index.js');
            if (existsSync(indexTs) || existsSync(indexJs)) {
                // Return directory/index.js
                return modulePath.endsWith('/')
                    ? modulePath + 'index.js'
                    : modulePath + '/index.js';
            }
        } else if (stat.isFile()) {
            // File exists, return as-is
            return modulePath;
        }
    }

    // Try without .js extension
    if (modulePath.endsWith('.js')) {
        const withoutJs = modulePath.slice(0, -3);
        const tryPath = join(fileDir, withoutJs + '.ts');
        if (existsSync(tryPath)) {
            // File exists as .ts, but we need .js for ESM
            return modulePath; // Keep .js extension
        }

        // Try as directory
        const dirPath = join(fileDir, withoutJs);
        if (existsSync(dirPath) && statSync(dirPath).isDirectory()) {
            const indexTs = join(dirPath, 'index.ts');
            const indexJs = join(dirPath, 'index.js');
            if (existsSync(indexTs) || existsSync(indexJs)) {
                return withoutJs + '/index.js';
            }
        }
    } else {
        // No .js extension, try adding it
        const withJs = modulePath + '.js';
        const tryPath = join(fileDir, withJs);
        if (existsSync(tryPath)) {
            return withJs;
        }

        // Try as .ts file
        const tryTsPath = join(fileDir, modulePath + '.ts');
        if (existsSync(tryTsPath)) {
            return modulePath + '.js';
        }

        // Try as directory
        const dirPath = join(fileDir, modulePath);
        if (existsSync(dirPath) && statSync(dirPath).isDirectory()) {
            const indexTs = join(dirPath, 'index.ts');
            const indexJs = join(dirPath, 'index.js');
            if (existsSync(indexTs) || existsSync(indexJs)) {
                return modulePath + '/index.js';
            }
        }
    }

    return null; // Could not resolve
}

// Process each file
for (const [filePath, errors] of errorsByFile.entries()) {
    if (!existsSync(filePath)) {
        console.warn(`  File not found: ${relative(workspaceRoot, filePath)}`);
        continue;
    }

    try {
        const sourceFile = project.addSourceFileAtPath(filePath);
        let fileModified = false;

        for (const error of errors) {
            const imports = sourceFile.getImportDeclarations();
            for (const importDecl of imports) {
                const specifier = importDecl.getModuleSpecifierValue();

                // Check if this import matches the error
                if (specifier === error.modulePath) {
                    const resolved = resolveModulePath(filePath, error.modulePath);
                    if (resolved && resolved !== error.modulePath) {
                        importDecl.setModuleSpecifier(resolved);
                        fileModified = true;
                        fixedCount++;
                        console.log(`  Fixed: ${relative(workspaceRoot, filePath)}:${error.line}`);
                        console.log(`    ${error.modulePath} -> ${resolved}`);
                    } else if (!resolved) {
                        console.warn(`  Could not resolve: ${relative(workspaceRoot, filePath)}:${error.line} - ${error.modulePath}`);
                    }
                }
            }
        }

        if (fileModified) {
            fixedFiles.push(filePath);
        }
    } catch (error) {
        console.error(`  Error processing ${relative(workspaceRoot, filePath)}: ${error.message}`);
    }
}

// Save changes
console.log('\nStep 3: Saving changes...');
project.saveSync();
console.log(`  Fixed ${fixedCount} imports in ${fixedFiles.length} files`);

console.log('\n' + '='.repeat(80));
console.log('Summary');
console.log('='.repeat(80));
console.log(`Total module errors: ${moduleErrors.length}`);
console.log(`Files with errors: ${errorsByFile.size}`);
console.log(`Imports fixed: ${fixedCount}`);
console.log(`Files modified: ${fixedFiles.length}`);

if (fixedFiles.length > 0 && fixedFiles.length <= 30) {
    console.log('\nModified files:');
    for (const file of fixedFiles) {
        console.log(`  ${relative(workspaceRoot, file)}`);
    }
}

console.log('\nDone!');
