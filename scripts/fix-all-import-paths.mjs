#!/usr/bin/env node
/**
 * Fix all @theia/core import paths in filesystem package
 * Converts @theia/core/lib/common/* to @theia/core
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workspaceRoot = join(__dirname, '..');
const filesystemSrc = join(workspaceRoot, 'packages', 'filesystem', 'src');

// Import replacements: [pattern, replacement, importNameChange?]
const replacements = [
    // URI imports - convert default to named
    [/import URI from ['"]@theia\/core\/lib\/common\/uri['"]/g, "import { URI } from '@theia/core'"],
    [/import type URI from ['"]@theia\/core\/lib\/common\/uri['"]/g, "import type { URI } from '@theia/core'"],
    // Other common imports
    [/from ['"]@theia\/core\/lib\/common\/(encoding-service|buffer|stream|file-uri|cancellation|promise-util|message-service|message-service-protocol|nls|event|logger|uuid|path|disposable|os|types|selection-service|command|uri-command-handler|objects)['"]/g,
        (match, p1) => `from '@theia/core'`],
    // Node imports
    [/from ['"]@theia\/core\/lib\/node\/(backend-application|messaging\/ipc-connection-provider|messaging\/ipc-protocol)['"]/g,
        (match, p1) => `from '@theia/core/lib/node/index.js'`],
    // Electron imports  
    [/from ['"]@theia\/core\/lib\/electron-main\/electron-main-application['"]/g,
        `from '@theia/core/lib/electron-main'`],
    // Test imports
    [/from ['"]@theia\/core\/lib\/common\/test\/mock-logger['"]/g,
        `from '@theia/core'`],
];

function getAllTsFiles(dir, fileList = []) {
    try {
        const stat = statSync(dir);
        if (!stat.isDirectory()) {
            return fileList;
        }
        const files = readdirSync(dir);
        for (const file of files) {
            const filePath = join(dir, file);
            try {
                const stat = statSync(filePath);
                if (stat.isDirectory()) {
                    if (!['node_modules', 'lib', 'dist', '.git', 'coverage', 'src-gen'].includes(file)) {
                        getAllTsFiles(filePath, fileList);
                    }
                } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
                    fileList.push(filePath);
                }
            } catch (e) {
                // Skip files we can't access
            }
        }
    } catch (e) {
        // Skip directories we can't access
    }
    return fileList;
}

console.log(`Looking for files in: ${filesystemSrc}`);
const files = getAllTsFiles(filesystemSrc);
console.log(`Found ${files.length} TypeScript files`);
if (files.length === 0) {
    console.error('No files found! Check the path.');
    process.exit(1);
}

let changedFiles = 0;
let totalChanges = 0;

for (const file of files) {
    try {
        let content = readFileSync(file, 'utf8');
        const originalContent = content;
        let fileChanges = 0;

        for (const [pattern, replacement] of replacements) {
            if (typeof replacement === 'function') {
                const newContent = content.replace(pattern, replacement);
                if (newContent !== content) {
                    fileChanges += (content.match(pattern) || []).length;
                    content = newContent;
                }
            } else {
                const matches = content.match(pattern);
                if (matches) {
                    content = content.replace(pattern, replacement);
                    fileChanges += matches.length;
                }
            }
        }

        if (content !== originalContent) {
            writeFileSync(file, content, 'utf8');
            changedFiles++;
            totalChanges += fileChanges;
            console.log(`Updated ${file} (${fileChanges} changes)`);
        }
    } catch (e) {
        console.error(`Error processing ${file}:`, e.message);
    }
}

console.log(`\nUpdated ${changedFiles} files with ${totalChanges} total changes`);
