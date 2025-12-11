import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filesystemSrcPath = join(__dirname, '../packages/filesystem/src');

// Import path mappings
const importMappings = [
    // URI imports - default import to named import
    {
        pattern: /import\s+URI\s+from\s+['"]@theia\/core\/lib\/common\/uri['"];?/g,
        replacement: "import { URI } from '@theia/core';"
    },
    // FileUri imports
    {
        pattern: /import\s+\{\s*FileUri\s*\}\s+from\s+['"]@theia\/core\/lib\/common\/file-uri['"];?/g,
        replacement: "import { FileUri } from '@theia/core';"
    },
    // Logger imports
    {
        pattern: /import\s+\{\s*ILogger\s*\}\s+from\s+['"]@theia\/core\/lib\/common\/logger['"];?/g,
        replacement: "import { ILogger } from '@theia/core';"
    },
    // UUID imports
    {
        pattern: /import\s+\{\s*generateUuid\s*\}\s+from\s+['"]@theia\/core\/lib\/common\/uuid['"];?/g,
        replacement: "import { generateUuid } from '@theia/core';"
    },
    // Objects imports
    {
        pattern: /import\s+\{\s*isEmpty\s*\}\s+from\s+['"]@theia\/core\/lib\/common\/objects['"];?/g,
        replacement: "import { isEmpty } from '@theia/core';"
    },
    // BackendApplicationContribution imports
    {
        pattern: /import\s+\{\s*BackendApplicationContribution\s*\}\s+from\s+['"]@theia\/core\/lib\/node\/backend-application['"];?/g,
        replacement: "import { BackendApplicationContribution } from '@theia/core/lib/node/index.js';"
    },
    // IPCEntryPoint imports
    {
        pattern: /import\s+\{\s*IPCEntryPoint\s*\}\s+from\s+['"]@theia\/core\/lib\/node\/messaging\/ipc-protocol['"];?/g,
        replacement: "import { IPCEntryPoint } from '@theia/core/lib/node/index.js';"
    },
    // Other common imports that might be in the same line
    {
        pattern: /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]@theia\/core\/lib\/common\/(encoding-service|buffer|stream|cancellation|promise-util|message-service|message-service-protocol|nls|event|uuid|path|disposable|os|types|selection-service|command|uri-command-handler|objects|env-variables)['"];?/g,
        replacement: (match, imports) => `import { ${imports} } from '@theia/core';`
    }
];

async function processFile(filePath) {
    try {
        let content = await readFile(filePath, 'utf-8');
        let modified = false;

        for (const mapping of importMappings) {
            const newContent = content.replace(mapping.pattern, mapping.replacement);
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
