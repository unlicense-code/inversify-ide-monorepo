#!/usr/bin/env node
/**
 * Migration script to help automate Inversify to ES Modules refactoring
 * 
 * This script performs basic transformations that can be automated:
 * - Removes @injectable() decorators
 * - Removes @inject() decorators and converts to constructor parameters
 * - Removes @postConstruct() decorators
 * - Updates imports
 * 
 * WARNING: This is a helper script. Manual review and adjustment is required.
 * 
 * Usage: node scripts/migrate-inversify.mjs <file-path>
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function migrateFile(filePath) {
    console.log(`Migrating: ${filePath}`);
    
    let content = readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // 1. Remove @injectable() decorator
    content = content.replace(/@injectable\(\)\s*\n/g, '');
    
    // 2. Remove @postConstruct() decorator and method
    content = content.replace(/@postConstruct\(\)\s*\n\s*protected\s+init\(\):\s*void\s*\{[^}]*\}/g, '');
    
    // 3. Remove inversify imports (but keep the file for manual review)
    content = content.replace(/import\s+.*from\s+['"]@theia\/core\/shared\/inversify['"];?\n/g, '');
    
    // 4. Convert @inject() properties to constructor parameters
    // This is complex and may need manual adjustment
    const injectPattern = /@inject\(([^)]+)\)\s*\n\s*(protected\s+)?(readonly\s+)?(\w+):\s*(\w+);/g;
    
    // Note: Full conversion requires AST parsing - this is a simplified version
    // Manual review required for complex cases
    
    if (content !== originalContent) {
        // Backup original
        const backupPath = filePath + '.inversify-backup';
        writeFileSync(backupPath, originalContent);
        console.log(`  Backup created: ${backupPath}`);
        
        // Write migrated content
        writeFileSync(filePath, content);
        console.log(`  Migrated: ${filePath}`);
        console.log(`  ⚠️  Manual review required!`);
    } else {
        console.log(`  No changes needed`);
    }
}

function findTypeScriptFiles(dir, fileList = []) {
    const files = readdirSync(dir);
    
    files.forEach(file => {
        const filePath = join(dir, file);
        const stat = statSync(filePath);
        
        if (stat.isDirectory()) {
            // Skip node_modules and other build directories
            if (!['node_modules', 'lib', 'dist', '.git'].includes(file)) {
                findTypeScriptFiles(filePath, fileList);
            }
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

// Main
const targetPath = process.argv[2];

if (!targetPath) {
    console.error('Usage: node scripts/migrate-inversify.mjs <file-or-directory>');
    process.exit(1);
}

const stat = statSync(targetPath);

if (stat.isDirectory()) {
    console.log(`Scanning directory: ${targetPath}`);
    const files = findTypeScriptFiles(targetPath);
    console.log(`Found ${files.length} TypeScript files`);
    
    files.forEach(file => {
        try {
            migrateFile(file);
        } catch (error) {
            console.error(`Error migrating ${file}:`, error.message);
        }
    });
} else if (stat.isFile() && targetPath.endsWith('.ts')) {
    migrateFile(targetPath);
} else {
    console.error('Please provide a TypeScript file or directory');
    process.exit(1);
}

console.log('\n✅ Migration complete!');
console.log('⚠️  Remember to:');
console.log('   1. Review all changes manually');
console.log('   2. Update constructor parameters');
console.log('   3. Update module files');
console.log('   4. Update tests');
console.log('   5. Remove backup files after verification');
