#!/usr/bin/env node
/**
 * Simple script to convert interfaces to types using regex
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findTsFiles(dir, fileList = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!['node_modules', 'lib', 'dist', '.git', '.vscode', '.theia', '.github'].includes(entry.name)) {
                findTsFiles(fullPath, fileList);
            }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.endsWith('.d.ts')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

function convertInterfacesInFile(filePath, dryRun) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        let modified = false;
        let interfaceCount = 0;

        // Count interfaces first
        const interfaceMatches = content.match(/\binterface\s+\w+/g);
        if (interfaceMatches) {
            interfaceCount = interfaceMatches.length;
        }

        if (interfaceCount === 0) {
            return false;
        }

        // Pattern 1: export interface Name extends Base1, Base2 { ... }
        // This needs to handle multi-line extends and complex cases
        const pattern1 = /(export\s+)(default\s+)?(interface\s+)(\w+)(\s*<[^>]*>)?(\s+extends\s+)([^{]+?)(\{[\s\S]*?\})/g;
        content = content.replace(pattern1, (match, exportKw, defaultKw, interfaceKw, name, typeParams, extendsKw, baseTypes, body) => {
            modified = true;
            // Convert extends to intersection - handle comma-separated types
            const types = baseTypes.split(',').map(t => t.trim()).filter(t => t).join(' & ');
            const defaultPart = defaultKw || '';
            return `${exportKw}${defaultPart}type ${name}${typeParams || ''} = ${types} & ${body}`;
        });

        // Pattern 2: export interface Name { ... } or export default interface Name { ... }
        const pattern2 = /(export\s+)(default\s+)?(interface\s+)(\w+)(\s*<[^>]*>)?(\s*\{[\s\S]*?\})/g;
        content = content.replace(pattern2, (match, exportKw, defaultKw, interfaceKw, name, typeParams, body) => {
            // Skip if already processed by pattern1 (has extends)
            if (match.includes('extends')) {
                return match;
            }
            modified = true;
            const defaultPart = defaultKw || '';
            return `${exportKw}${defaultPart}type ${name}${typeParams || ''} = ${body}`;
        });

        // Pattern 3: interface Name { ... } (non-exported, at start of line or after newline)
        const pattern3 = /(^|\n)(\s*)(interface\s+)(\w+)(\s*<[^>]*>)?(\s*\{[\s\S]*?\})/gm;
        content = content.replace(pattern3, (match, before, indent, interfaceKw, name, typeParams, body) => {
            // Skip if already processed (has export or extends)
            if (match.includes('export') || match.includes('extends')) {
                return match;
            }
            modified = true;
            return `${before}${indent}type ${name}${typeParams || ''} = ${body}`;
        });

        if (modified && content !== originalContent) {
            if (!dryRun) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`✅ Converted ${interfaceCount} interface(s) in: ${filePath}`);
            } else {
                console.log(`[DRY RUN] Would convert ${interfaceCount} interface(s) in: ${filePath}`);
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return false;
    }
}

async function main() {
    console.log('Script started');
    const args = process.argv.slice(2);
    console.log('Args:', args);
    const dryRun = args.includes('--dry-run');
    const targetPath = args.find(arg => !arg.startsWith('--'));

    if (!targetPath) {
        console.error('Usage: node scripts/convert-interfaces-simple.mjs <file-or-directory> [--dry-run]');
        process.exit(1);
    }

    const fullPath = path.resolve(targetPath);
    console.log(`Processing: ${fullPath}`);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Path does not exist: ${fullPath}`);
    }

    const files = fs.statSync(fullPath).isDirectory()
        ? findTsFiles(fullPath)
        : [fullPath];

    console.log(`Found ${files.length} TypeScript files\n`);

    let filesProcessed = 0;
    let filesModified = 0;

    for (const file of files) {
        try {
            if (convertInterfacesInFile(file, dryRun)) {
                filesModified++;
            }
            filesProcessed++;
        } catch (error) {
            console.error(`❌ Error processing ${file}:`, error.message);
        }
    }

    console.log(`\n📊 Statistics:`);
    console.log(`  Files processed: ${filesProcessed}`);
    console.log(`  Files modified: ${filesModified}`);

    if (dryRun) {
        console.log(`\n⚠️  DRY RUN MODE - No files were modified`);
    }
}

main().catch(error => {
    console.error('Conversion failed:', error);
    process.exit(1);
});
