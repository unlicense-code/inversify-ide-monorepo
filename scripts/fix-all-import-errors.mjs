#!/usr/bin/env node
/**
 * Comprehensive script to fix all TypeScript import errors after adding .js extensions
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { Project } from 'ts-morph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..');

console.log('='.repeat(80));
console.log('Comprehensive TypeScript Import Error Fixer');
console.log('='.repeat(80));
console.log(`Workspace root: ${workspaceRoot}`);
console.log('');

// Step 1: Ensure all relative imports have .js extensions
console.log('Step 1: Ensuring all relative imports have .js extensions...');
const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
});

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

const packagesDir = join(workspaceRoot, 'packages');
const tsFiles = getAllTsFiles(packagesDir);
console.log(`Found ${tsFiles.length} TypeScript files`);

let addedCount = 0;
for (const filePath of tsFiles) {
    try {
        project.addSourceFileAtPath(filePath);
        addedCount++;
    } catch (error) {
        // Skip files that can't be added
    }
}
console.log(`Added ${addedCount} files to project`);

// Fix imports
let fixedImports = 0;
let filesModified = 0;

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

        // Skip if already has .js extension
        if (moduleSpecifier.endsWith('.js')) {
            continue;
        }

        // Skip if it's an index import (will be resolved automatically)
        if (moduleSpecifier.endsWith('/index')) {
            continue;
        }

        // Skip if it's a directory import (ends with /)
        if (moduleSpecifier.endsWith('/')) {
            continue;
        }

        // Skip if it's a JSON import
        if (moduleSpecifier.endsWith('.json')) {
            continue;
        }

        // Add .js extension
        const newSpecifier = moduleSpecifier + '.js';
        importDecl.setModuleSpecifier(newSpecifier);
        fixedImports++;
        fileModified = true;
    }

    if (fileModified) {
        filesModified++;
    }
}

console.log(`Fixed ${fixedImports} imports in ${filesModified} files`);
project.saveSync();

// Step 2: Run tsc to find remaining errors
console.log('\nStep 2: Running TypeScript compiler to find errors...');
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

const errorLines = tscOutput.split('\n').filter(line =>
    line.includes('error TS') && (
        line.includes('Cannot find module') ||
        line.includes('File ends with') ||
        line.includes('Module not found')
    )
);

console.log(`Found ${errorLines.length} import-related errors`);

if (errorLines.length === 0) {
    console.log('\nNo import errors found! All imports are correctly configured.');
    process.exit(0);
}

// Step 3: Fix errors systematically
console.log('\nStep 3: Fixing errors systematically...');

const errorsByFile = new Map();
for (const line of errorLines) {
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

let fixedErrors = 0;

for (const [filePath, errors] of errorsByFile.entries()) {
    if (!existsSync(filePath)) {
        continue;
    }

    try {
        const sourceFile = project.getSourceFile(filePath);
        if (!sourceFile) {
            continue;
        }

        let fileModified = false;

        for (const error of errors) {
            const moduleMatch = error.message.match(/Cannot find module ['"]([^'"]+)['"]/);
            if (moduleMatch) {
                const modulePath = moduleMatch[1];

                if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
                    const imports = sourceFile.getImportDeclarations();
                    for (const importDecl of imports) {
                        const specifier = importDecl.getModuleSpecifierValue();

                        if (specifier === modulePath) {
                            const fileDir = dirname(filePath);
                            const resolvedPath = join(fileDir, modulePath);

                            // Check if it's a directory that needs index
                            if (existsSync(resolvedPath) && statSync(resolvedPath).isDirectory()) {
                                const indexTs = join(resolvedPath, 'index.ts');
                                const indexJs = join(resolvedPath, 'index.js');

                                if (existsSync(indexTs) || existsSync(indexJs)) {
                                    // Change to directory/index.js
                                    const newSpecifier = modulePath.endsWith('/')
                                        ? modulePath + 'index.js'
                                        : modulePath + '/index.js';
                                    importDecl.setModuleSpecifier(newSpecifier);
                                    fileModified = true;
                                    fixedErrors++;
                                    console.log(`  Fixed: ${relative(workspaceRoot, filePath)}:${error.line} - ${modulePath} -> ${newSpecifier}`);
                                }
                            } else {
                                // Try without .js extension
                                const withoutJs = modulePath.replace(/\.js$/, '');
                                const tryPath = join(fileDir, withoutJs + '.ts');
                                if (existsSync(tryPath)) {
                                    // File exists, but import might be wrong
                                    // Check if we need to add .js
                                    if (!modulePath.endsWith('.js')) {
                                        importDecl.setModuleSpecifier(modulePath + '.js');
                                        fileModified = true;
                                        fixedErrors++;
                                        console.log(`  Fixed: ${relative(workspaceRoot, filePath)}:${error.line} - Added .js to ${modulePath}`);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (fileModified) {
            project.saveSync();
        }
    } catch (error) {
        // Skip files with errors
    }
}

console.log(`\nFixed ${fixedErrors} errors`);

console.log('\n' + '='.repeat(80));
console.log('Summary');
console.log('='.repeat(80));
console.log(`Total TypeScript files: ${tsFiles.length}`);
console.log(`Imports fixed: ${fixedImports}`);
console.log(`Files modified: ${filesModified}`);
console.log(`Import errors found: ${errorLines.length}`);
console.log(`Errors fixed: ${fixedErrors}`);
console.log('\nDone!');
