#!/usr/bin/env node
/**
 * Script to add .js extensions to all relative imports in TypeScript files
 * for ESM compatibility using ts-morph
 */

// Immediate output to verify script is running
process.stderr.write('Script starting...\n');
process.stdout.write('Script starting...\n');

import { Project } from 'ts-morph';
import { readdirSync, statSync, existsSync, writeFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packagesDir = join(__dirname, '../packages');
const workspaceRoot = join(__dirname, '..');

if (!existsSync(packagesDir)) {
    console.error(`Packages directory not found: ${packagesDir}`);
    process.exit(1);
}

// Force output flushing
const log = (...args) => {
    console.log(...args);
    if (process.stdout.isTTY) {
        process.stdout.write('');
    }
};

log('='.repeat(80));
log('ESM Import Extension Fixer');
log('='.repeat(80));
log(`Workspace root: ${workspaceRoot}`);
log(`Packages directory: ${packagesDir}`);
log(`Directory exists: ${existsSync(packagesDir)}`);
log('');

function getAllTsFiles(dir, fileList = []) {
    const files = readdirSync(dir);

    for (const file of files) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
            // Skip node_modules, lib, dist, and other build directories
            if (!['node_modules', 'lib', 'dist', '.git', 'coverage', 'src-gen'].includes(file)) {
                getAllTsFiles(filePath, fileList);
            }
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
            fileList.push(filePath);
        }
    }

    return fileList;
}

function main() {
    let tsFiles;
    let project;

    try {
        log('Step 1: Finding all TypeScript files...');
        tsFiles = getAllTsFiles(packagesDir);
        log(`Found ${tsFiles.length} TypeScript files`);

        if (tsFiles.length === 0) {
            console.error('No TypeScript files found!');
            return;
        }
    } catch (error) {
        console.error('Error in Step 1:', error);
        process.exit(1);
    }

    try {
        log('\nStep 2: Initializing ts-morph project...');
        const tsConfigPath = join(workspaceRoot, 'tsconfig.json');
        log(`  Looking for tsconfig.json at: ${tsConfigPath}`);
        log(`  tsconfig.json exists: ${existsSync(tsConfigPath)}`);

        project = new Project({
            tsConfigFilePath: existsSync(tsConfigPath) ? tsConfigPath : undefined,
            skipAddingFilesFromTsConfig: true,
            skipFileDependencyResolution: true,
            skipLoadingLibFiles: true,
        });

        log(`Adding ${tsFiles.length} source files to project...`);
        let addedCount = 0;
        let skippedCount = 0;

        for (const filePath of tsFiles) {
            try {
                const sourceFile = project.addSourceFileAtPath(filePath);
                if (sourceFile) {
                    addedCount++;
                } else {
                    skippedCount++;
                }
            } catch (error) {
                console.warn(`  Warning: Could not add ${relative(workspaceRoot, filePath)}: ${error.message}`);
                skippedCount++;
            }
        }

        log(`  Added: ${addedCount} files`);
        log(`  Skipped: ${skippedCount} files`);
    } catch (error) {
        console.error('Error in Step 2:', error);
        process.exit(1);
    }

    log('\nStep 3: Analyzing and fixing imports...');
    let totalImports = 0;
    let fixedImports = 0;
    let filesModified = 0;
    const fixedFiles = [];
    const skippedImports = [];

    for (const sourceFile of project.getSourceFiles()) {
        const filePath = sourceFile.getFilePath();
        const relPath = relative(workspaceRoot, filePath);

        // Skip if not in packages directory
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

            totalImports++;

            // Skip if already has .js extension
            if (moduleSpecifier.endsWith('.js')) {
                skippedImports.push({
                    file: relPath,
                    import: moduleSpecifier,
                    reason: 'already has .js extension'
                });
                continue;
            }

            // Skip if it's an index import (will be resolved automatically)
            if (moduleSpecifier.endsWith('/index')) {
                skippedImports.push({
                    file: relPath,
                    import: moduleSpecifier,
                    reason: 'index import (auto-resolved)'
                });
                continue;
            }

            // Skip if it's a directory import (ends with /)
            if (moduleSpecifier.endsWith('/')) {
                skippedImports.push({
                    file: relPath,
                    import: moduleSpecifier,
                    reason: 'directory import (ends with /)'
                });
                continue;
            }

            // Skip if it's a JSON import
            if (moduleSpecifier.endsWith('.json')) {
                skippedImports.push({
                    file: relPath,
                    import: moduleSpecifier,
                    reason: 'JSON import'
                });
                continue;
            }

            // Add .js extension
            const newSpecifier = moduleSpecifier + '.js';
            importDecl.setModuleSpecifier(newSpecifier);
            fixedImports++;
            fileModified = true;

            log(`  Fixed: ${relPath}`);
            log(`    ${moduleSpecifier} -> ${newSpecifier}`);
        }

        if (fileModified) {
            filesModified++;
            fixedFiles.push(relPath);
        }
    }

    log('\nStep 4: Saving changes...');
    project.saveSync();
    log(`  Saved ${filesModified} modified files`);

    log('\n' + '='.repeat(80));
    log('Summary');
    log('='.repeat(80));
    log(`Total TypeScript files processed: ${tsFiles.length}`);
    log(`Files modified: ${filesModified}`);
    log(`Total relative imports found: ${totalImports}`);
    log(`Imports fixed: ${fixedImports}`);
    log(`Imports skipped: ${skippedImports.length}`);

    if (skippedImports.length > 0 && skippedImports.length <= 20) {
        log('\nSkipped imports:');
        for (const skipped of skippedImports) {
            log(`  ${skipped.file}: ${skipped.import} (${skipped.reason})`);
        }
    } else if (skippedImports.length > 20) {
        log(`\nSkipped imports: ${skippedImports.length} (too many to display)`);
    }

    if (fixedFiles.length > 0 && fixedFiles.length <= 20) {
        log('\nModified files:');
        for (const file of fixedFiles) {
            log(`  ${file}`);
        }
    } else if (fixedFiles.length > 20) {
        log(`\nModified files: ${fixedFiles.length} (too many to display)`);
    }

    log('\nDone!');
}

// Wrap main in try-catch to catch any unhandled errors
// Also write output to file for debugging
const logFile = join(workspaceRoot, 'fix-esm-imports.log');
const originalLog = console.log;
const originalError = console.error;
const logMessages = [];

const logToFile = (...args) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    logMessages.push(msg);
    originalLog(...args);
};

console.log = logToFile;
console.error = (...args) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    logMessages.push('ERROR: ' + msg);
    originalError(...args);
};

try {
    main();
    // Write log to file
    writeFileSync(logFile, logMessages.join('\n'), 'utf8');
    console.log(`\nLog written to: ${logFile}`);
} catch (error) {
    logMessages.push('FATAL ERROR: ' + error.message);
    logMessages.push(error.stack);
    writeFileSync(logFile, logMessages.join('\n'), 'utf8');
    console.error('Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
}
