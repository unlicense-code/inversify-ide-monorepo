#!/usr/bin/env node
/**
 * Script to fix TypeScript import errors after adding .js extensions
 * This script will:
 * 1. Run tsc --noEmit to find errors
 * 2. Parse errors related to imports
 * 3. Fix them systematically
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Project } from 'ts-morph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..');

console.log('='.repeat(80));
console.log('TypeScript Import Error Fixer');
console.log('='.repeat(80));
console.log(`Workspace root: ${workspaceRoot}`);
console.log('');

// Run tsc to get errors
console.log('Step 1: Running TypeScript compiler to find errors...');
let tscOutput = '';
try {
    tscOutput = execSync('npx tsc --noEmit --pretty false', {
        cwd: workspaceRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });
} catch (error) {
    tscOutput = error.stdout || error.stderr || '';
}

// Parse errors
const errorLines = tscOutput.split('\n').filter(line =>
    line.includes('error TS') && (
        line.includes('Cannot find module') ||
        line.includes('File ends with') ||
        line.includes('Module not found')
    )
);

console.log(`Found ${errorLines.length} import-related errors`);
console.log('');

if (errorLines.length === 0) {
    console.log('No import errors found!');
    process.exit(0);
}

// Group errors by file
const errorsByFile = new Map();
for (const line of errorLines) {
    // Parse: file.ts(line,col): error TS2307: Cannot find module './something.js'
    const match = line.match(/^(.+\.ts)\((\d+),(\d+)\):\s+error\s+TS\d+:\s+(.+)$/);
    if (match) {
        const [, filePath, lineNum, colNum, message] = match;
        const fullPath = join(workspaceRoot, filePath);
        if (!errorsByFile.has(fullPath)) {
            errorsByFile.set(fullPath, []);
        }
        errorsByFile.get(fullPath).push({
            line: parseInt(lineNum),
            col: parseInt(colNum),
            message
        });
    }
}

console.log(`Step 2: Analyzing errors in ${errorsByFile.size} files...`);

// Initialize ts-morph project
const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
});

let fixedCount = 0;
const fixedFiles = [];

// Process each file with errors
for (const [filePath, errors] of errorsByFile.entries()) {
    if (!existsSync(filePath)) {
        console.warn(`  File not found: ${filePath}`);
        continue;
    }

    try {
        const sourceFile = project.addSourceFileAtPath(filePath);
        let fileModified = false;

        for (const error of errors) {
            // Check if it's a module resolution error
            const moduleMatch = error.message.match(/Cannot find module ['"]([^'"]+)['"]/);
            if (moduleMatch) {
                const modulePath = moduleMatch[1];

                // Only fix relative imports
                if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
                    // Check if the import exists
                    const imports = sourceFile.getImportDeclarations();
                    for (const importDecl of imports) {
                        const specifier = importDecl.getModuleSpecifierValue();
                        if (specifier === modulePath) {
                            // Try to fix by checking if file exists without .js
                            const fileDir = dirname(filePath);
                            const resolvedPath = join(fileDir, modulePath);

                            // Check if .ts file exists
                            if (existsSync(resolvedPath + '.ts')) {
                                // Import should point to .ts, but we need .js for ESM
                                // Actually, if the file is .ts, the import should be .js
                                // This might be a case where the file doesn't exist at all
                                console.log(`  ${filePath}:${error.line} - Module ${modulePath} not found`);
                            } else if (existsSync(resolvedPath + '.js')) {
                                // File exists as .js, import is correct
                                console.log(`  ${filePath}:${error.line} - Module ${modulePath} exists as .js`);
                            } else if (existsSync(resolvedPath)) {
                                // Directory exists, might need index
                                const indexFile = join(resolvedPath, 'index.ts');
                                if (existsSync(indexFile)) {
                                    // Should import from directory/index.js
                                    importDecl.setModuleSpecifier(modulePath + '/index.js');
                                    fileModified = true;
                                    console.log(`  Fixed: ${filePath}:${error.line} - Changed ${modulePath} to ${modulePath}/index.js`);
                                }
                            } else {
                                // Try removing .js extension
                                const withoutJs = modulePath.replace(/\.js$/, '');
                                const tryPath = join(fileDir, withoutJs + '.ts');
                                if (existsSync(tryPath)) {
                                    // File exists without .js, but we need .js for ESM
                                    // This is correct - the import should have .js
                                    console.log(`  ${filePath}:${error.line} - Module ${modulePath} should exist (file is ${withoutJs}.ts)`);
                                }
                            }
                        }
                    }
                }
            }
        }

        if (fileModified) {
            fixedCount++;
            fixedFiles.push(filePath);
        }
    } catch (error) {
        console.error(`  Error processing ${filePath}: ${error.message}`);
    }
}

// Save changes
console.log('\nStep 3: Saving changes...');
project.saveSync();
console.log(`  Fixed ${fixedCount} files`);

console.log('\n' + '='.repeat(80));
console.log('Summary');
console.log('='.repeat(80));
console.log(`Total errors found: ${errorLines.length}`);
console.log(`Files with errors: ${errorsByFile.size}`);
console.log(`Files fixed: ${fixedCount}`);

if (fixedFiles.length > 0 && fixedFiles.length <= 20) {
    console.log('\nFixed files:');
    for (const file of fixedFiles) {
        console.log(`  ${file}`);
    }
}

console.log('\nDone!');
