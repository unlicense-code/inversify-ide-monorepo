#!/usr/bin/env node
/**
 * Fix all import paths in filesystem package
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..');
const filesystemSrc = join(workspaceRoot, 'packages', 'filesystem', 'src');

function getAllTsFiles(dir, fileList = []) {
    try {
        const stat = statSync(dir);
        if (!stat.isDirectory()) return fileList;
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
            } catch (e) { }
        }
    } catch (e) { }
    return fileList;
}

const files = getAllTsFiles(filesystemSrc);
console.error(`Processing ${files.length} files in ${filesystemSrc}`);
if (files.length === 0) {
    console.error('ERROR: No files found!');
    process.exit(1);
}

let changed = 0;

for (const file of files) {
    try {
        let content = readFileSync(file, 'utf8');
        const original = content;

        // Fix URI imports
        content = content.replace(/import URI from ['"]@theia\/core\/lib\/common\/uri['"]/g, "import { URI } from '@theia/core'");
        content = content.replace(/import type URI from ['"]@theia\/core\/lib\/common\/uri['"]/g, "import type { URI } from '@theia/core'");

        // Fix other @theia/core/lib/common/* imports
        const commonModules = [
            'encoding-service', 'buffer', 'stream', 'file-uri', 'cancellation',
            'promise-util', 'message-service', 'message-service-protocol', 'nls',
            'event', 'logger', 'uuid', 'path', 'disposable', 'os', 'types',
            'selection-service', 'command', 'uri-command-handler', 'objects',
            'test/mock-logger'
        ];

        for (const mod of commonModules) {
            const escaped = mod.replace(/\//g, '\\/');
            content = content.replace(
                new RegExp(`from ['"]@theia/core/lib/common/${escaped}['"]`, 'g'),
                "from '@theia/core'"
            );
        }

        // Fix node imports
        content = content.replace(/from ['"]@theia\/core\/lib\/node\/backend-application['"]/g, "from '@theia/core/lib/node/index.js'");
        content = content.replace(/from ['"]@theia\/core\/lib\/node\/messaging\/ipc-connection-provider['"]/g, "from '@theia/core/lib/node/index.js'");
        content = content.replace(/from ['"]@theia\/core\/lib\/node\/messaging\/ipc-protocol['"]/g, "from '@theia/core/lib/node/index.js'");

        // Fix electron imports
        content = content.replace(/from ['"]@theia\/core\/lib\/electron-main\/electron-main-application['"]/g, "from '@theia/core/lib/electron-main'");

        // Fix CommonJS trash import
        content = content.replace(/import trash = require\(['"]trash['"]\);/g, "import trash from 'trash';");

        if (content !== original) {
            writeFileSync(file, content, 'utf8');
            changed++;
            const relPath = file.replace(workspaceRoot + '\\', '').replace(workspaceRoot + '/', '');
            console.log(`  ✓ ${relPath}`);
        }
    } catch (e) {
        console.error(`Error processing ${file}:`, e.message);
    }
}

console.log(`\nUpdated ${changed} files`);
