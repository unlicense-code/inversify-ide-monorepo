#!/usr/bin/env node
/**
 * Fix @theia/core import paths from @theia/core/lib/common/* to @theia/core
 * Also fixes other common import issues
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Project } from 'ts-morph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..');
const packagesDir = join(workspaceRoot, 'packages');

// Import path mappings: old path -> new path
const importMappings = [
    // Common imports
    ['@theia/core/lib/common/uri.js', '@theia/core'],
    ['@theia/core/lib/common/encoding-service', '@theia/core'],
    ['@theia/core/lib/common/buffer.js', '@theia/core'],
    ['@theia/core/lib/common/stream', '@theia/core'],
    ['@theia/core/lib/common/file-uri', '@theia/core'],
    ['@theia/core/lib/common/cancellation', '@theia/core'],
    ['@theia/core/lib/common/promise-util.js', '@theia/core'],
    ['@theia/core/lib/common/message-service', '@theia/core'],
    ['@theia/core/lib/common/message-service-protocol', '@theia/core'],
    [import { nls } from '@theia/core/lib/common/nls.js', '@theia/core'],
['@theia/core/lib/common/event', '@theia/core'],
    ['@theia/core/lib/common/logger.js', '@theia/core'],
    ['@theia/core/lib/common/uuid', '@theia/core'],
    ['@theia/core/lib/common/path', '@theia/core'],
    ['@theia/core/lib/common/disposable.js', '@theia/core'],
    ['@theia/core/lib/common/os', '@theia/core'],
    ['@theia/core/lib/common/types', '@theia/core'],
    ['@theia/core/lib/common/selection-service', '@theia/core'],
    ['@theia/core/lib/common/command', '@theia/core'],
    ['@theia/core/lib/common/uri-command-handler', '@theia/core'],
    ['@theia/core/lib/common/objects', '@theia/core'],
    ['@theia/core/lib/common/test/mock-logger.js', '@theia/core'],
    // Node imports
    ['@theia/core/lib/node/backend-application.js', '@theia/core/lib/node/index.js'],
    ['@theia/core/lib/node/messaging/ipc-connection-provider', '@theia/core/lib/node/index.js'],
    ['@theia/core/lib/node/messaging/ipc-protocol', '@theia/core/lib/node/index.js'],
    // Electron imports
    ['@theia/core/lib/electron-main/electron-main-application', '@theia/core/lib/electron-main'],
];

function getAllTsFiles(dir, fileList = []) {
    if (!statSync(dir).isDirectory()) {
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

// Only process filesystem package for now
const filesystemSrc = join(packagesDir, 'filesystem', 'src');
const files = getAllTsFiles(filesystemSrc);
console.log(`Found ${files.length} TypeScript files in filesystem package`);

files.forEach(file => {
    project.addSourceFileAtPath(file);
});

let changedFiles = 0;

project.getSourceFiles().forEach(sourceFile => {
    let changed = false;

    sourceFile.getImportDeclarations().forEach(importDecl => {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();

        // Check if this import needs to be updated
        for (const [oldPath, newPath] of importMappings) {
            if (moduleSpecifier === oldPath) {
                importDecl.setModuleSpecifier(newPath);
                changed = true;
                console.log(`Updated import in ${sourceFile.getFilePath()}: ${oldPath} -> ${newPath}`);
            }
        }

        // Fix URI default import to named import
        if (moduleSpecifier === '@theia/core' || moduleSpecifier === '@theia/core/lib/common/uri.js') {
            const namedImports = importDecl.getNamedImports();
            const defaultImport = importDecl.getDefaultImport();

            if (defaultImport && defaultImport.getText() === 'URI') {
                // Convert default import to named import
                importDecl.removeDefaultImport();
                if (!namedImports.find(n => n.getName() === 'URI')) {
                    importDecl.addNamedImport('URI');
                }
                if (moduleSpecifier === '@theia/core/lib/common/uri.js') {
                    importDecl.setModuleSpecifier('@theia/core');
                }
                changed = true;
            }
        }
    });

    if (changed) {
        sourceFile.saveSync();
        changedFiles++;
    }
});

console.log(`\nUpdated ${changedFiles} files`);
