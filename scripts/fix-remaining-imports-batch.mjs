import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filesystemSrcPath = join(__dirname, '../packages/filesystem/src');

// Import path mappings - order matters!
const importMappings = [
    // FileUri - should be from @theia/core/lib/node, not @theia/core
    {
        pattern: /import\s+\{\s*FileUri\s*\}\s+from\s+['"]@theia\/core['"];?/g,
        replacement: "import { FileUri } from '@theia/core/lib/node/index.js';"
    },
    // IPCEntryPoint - should be from ipc-protocol directly
    {
        pattern: /import\s+\{\s*IPCEntryPoint\s*\}\s+from\s+['"]@theia\/core\/lib\/node['"];?/g,
        replacement: "import { IPCEntryPoint } from '@theia/core/lib/node/messaging/ipc-protocol.js';"
    },
    // URI default import to named import
    {
        pattern: /import\s+URI\s+from\s+['"]@theia\/core\/lib\/common\/uri['"];?/g,
        replacement: "import { URI } from '@theia/core';"
    },
    // Common imports from @theia/core/lib/common/* to @theia/core
    {
        pattern: /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]@theia\/core\/lib\/common\/(message-service-protocol|nls|event|stream|selection-service|command|uri-command-handler|logger|buffer|uuid|disposable|encoding-service|file-uri|promise-util|test\/mock-logger)['"];?/g,
        replacement: (match, imports, module) => {
            // Special case for test/mock-logger
            if (module === 'test/mock-logger') {
                return `import { ${imports} } from '@theia/core/lib/common/test/mock-logger.js';`;
            }
            return `import { ${imports} } from '@theia/core';`;
        }
    },
    // Node-specific imports
    {
        pattern: /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]@theia\/core\/lib\/node\/(messaging\/ipc-connection-provider|messaging\/ipc-protocol)['"];?/g,
        replacement: (match, imports, module) => {
            if (module === 'messaging/ipc-protocol') {
                return `import { ${imports} } from '@theia/core/lib/node/messaging/ipc-protocol.js';`;
            }
            return `import { ${imports} } from '@theia/core/lib/node/index.js';`;
        }
    },
    // Electron-main imports
    {
        pattern: /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]@theia\/core\/lib\/electron-main\/electron-main-application['"];?/g,
        replacement: (match, imports) => `import { ${imports} } from '@theia/core/lib/electron-main';`
    }
];

async function processFile(filePath) {
    try {
        let content = await readFile(filePath, 'utf-8');
        let modified = false;

        for (const mapping of importMappings) {
            const newContent = typeof mapping.replacement === 'function'
                ? content.replace(mapping.pattern, mapping.replacement)
                : content.replace(mapping.pattern, mapping.replacement);
            if (newContent !== content) {
                content = newContent;
                modified = true;
            }
        }

        if (modified) {
            await writeFile(filePath, content, 'utf-8');
            console.log(`Fixed: ${filePath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
        return false;
    }
}

async function processDirectory(dirPath) {
    const entries = await readdir(dirPath, { withFileTypes: true });
    let fixedCount = 0;

    for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
            fixedCount += await processDirectory(fullPath);
        } else if (entry.isFile() && (extname(entry.name) === '.ts' || extname(entry.name) === '.tsx')) {
            if (await processFile(fullPath)) {
                fixedCount++;
            }
        }
    }

    return fixedCount;
}

async function main() {
    console.log('Fixing remaining import paths in filesystem package...');
    const fixedCount = await processDirectory(filesystemSrcPath);
    console.log(`\nFixed ${fixedCount} files.`);
}

main().catch(console.error);
