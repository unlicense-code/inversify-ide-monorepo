#!/usr/bin/env node
/**
 * Convert all interfaces to types using ts-morph
 */

import { Project, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const import.meta.dirname = path.dirname(__filename);

async function convertInterfacesToTypes(targetPath: string, dryRun: boolean = false) {
    const project = new Project({
        tsConfigFilePath: path.join(import.meta.dirname, '../tsconfig.json'),
        skipAddingFilesFromTsConfig: true,
    });

    const fullPath = path.resolve(targetPath);
    console.log(`Processing: ${fullPath}`);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Path does not exist: ${fullPath}`);
    }

    const files: string[] = [];

    function findFiles(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!['node_modules', 'lib', 'dist', '.git', '.vscode', '.theia', '.github'].includes(entry.name)) {
                    findFiles(fullPath);
                }
            } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.endsWith('.d.ts')) {
                files.push(fullPath);
            }
        }
    }

    if (fs.statSync(fullPath).isDirectory()) {
        findFiles(fullPath);
    } else {
        files.push(fullPath);
    }

    console.log(`Found ${files.length} TypeScript files\n`);

    let filesProcessed = 0;
    let filesModified = 0;
    let interfacesConverted = 0;

    for (const filePath of files) {
        try {
            const sourceFile = project.addSourceFileAtPath(filePath);
            const interfaces = sourceFile.getInterfaces();

            if (interfaces.length === 0) {
                continue;
            }

            filesProcessed++;
            let modified = false;

            console.log(`Processing: ${filePath} (${interfaces.length} interface(s))`);

            // Process interfaces in reverse order to avoid node invalidation issues
            // We need to get all data first, then replace from end to start
            interface InterfaceData {
                interfaceDecl: InterfaceDeclaration;
                typeText: string;
                name: string;
            }

            const interfaceDataList: InterfaceData[] = [];

            // First pass: collect all interface data
            for (const interfaceDecl of interfaces) {
                try {
                    const name = interfaceDecl.getName();
                    const isExported = interfaceDecl.isExported();
                    const isDefaultExport = interfaceDecl.isDefaultExport();
                    const typeParameters = interfaceDecl.getTypeParameters();

                    // Get extends clauses
                    const heritageClauses = interfaceDecl.getHeritageClauses();
                    const extendsTypes: string[] = [];

                    for (const clause of heritageClauses) {
                        if (clause.getToken() === SyntaxKind.ExtendsKeyword) {
                            for (const typeNode of clause.getTypeNodes()) {
                                extendsTypes.push(typeNode.getText());
                            }
                        }
                    }

                    // Get body content - extract from the full text
                    const interfaceText = interfaceDecl.getText();
                    const openBraceIndex = interfaceText.indexOf('{');
                    const closeBraceIndex = interfaceText.lastIndexOf('}');

                    let bodyContent = '';
                    if (openBraceIndex !== -1 && closeBraceIndex !== -1 && closeBraceIndex > openBraceIndex) {
                        bodyContent = interfaceText.substring(openBraceIndex + 1, closeBraceIndex);
                    }

                    // Build type declaration
                    let typeText = '';

                    if (isDefaultExport) {
                        typeText += 'export default ';
                    } else if (isExported) {
                        typeText += 'export ';
                    }

                    typeText += 'type ';
                    typeText += name;

                    if (typeParameters.length > 0) {
                        const params = typeParameters.map(p => p.getText()).join(', ');
                        typeText += `<${params}>`;
                    }

                    typeText += ' = ';

                    if (extendsTypes.length > 0) {
                        typeText += extendsTypes.join(' & ') + ' & ';
                    }

                    typeText += '{' + bodyContent + '}';

                    // Store the interface declaration and replacement text
                    interfaceDataList.push({
                        interfaceDecl,
                        typeText,
                        name
                    });
                } catch (error) {
                    console.error(`    ❌ Error processing interface:`, error);
                    if (error instanceof Error) {
                        console.error(`       ${error.message}`);
                    }
                }
            }

            // Second pass: perform replacements in reverse order (from end to start)
            // This prevents node invalidation issues
            if (interfaceDataList.length > 0) {
                // Sort by position descending to replace from end to start
                interfaceDataList.sort((a, b) => b.interfaceDecl.getStart() - a.interfaceDecl.getStart());

                for (const data of interfaceDataList) {
                    try {
                        // Check if the node is still valid (hasn't been removed)
                        if (!data.interfaceDecl.wasForgotten()) {
                            // Use replaceWithText on the node itself
                            data.interfaceDecl.replaceWithText(data.typeText);
                            modified = true;
                            interfacesConverted++;
                            console.log(`    ✅ Converting interface: ${data.name}`);
                        } else {
                            console.log(`    ⏭️  Skipping interface ${data.name} (already processed)`);
                        }
                    } catch (error) {
                        // If replaceWithText fails, it might be due to context issues
                        // Skip this interface and log the error
                        console.error(`    ⚠️  Skipping interface ${data.name} due to replacement error`);
                        if (error instanceof Error) {
                            const errorMsg = error.message;
                            // Only show detailed error if it's not the common tree replacement error
                            if (!errorMsg.includes('Error replacing tree') && !errorMsg.includes('EmptyStatement')) {
                                console.error(`       ${errorMsg}`);
                            }
                        }
                    }
                }
            }

            if (modified) {
                filesModified++;
                if (!dryRun) {
                    sourceFile.saveSync();
                    console.log(`  ✅ Converted ${interfaces.length} interface(s) in: ${filePath}\n`);
                } else {
                    console.log(`  [DRY RUN] Would convert ${interfaces.length} interface(s) in: ${filePath}\n`);
                }
            } else {
                console.log(`  ⏭️  No changes needed: ${filePath}\n`);
            }
        } catch (error) {
            console.error(`❌ Error processing ${filePath}:`, error);
        }
    }

    console.log('\n📊 Statistics:');
    console.log(`  Files processed: ${filesProcessed}`);
    console.log(`  Files modified: ${filesModified}`);
    console.log(`  Interfaces converted: ${interfacesConverted}`);

    if (dryRun) {
        console.log('\n⚠️  DRY RUN MODE - No files were modified');
    }
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetPath = args.find(arg => !arg.startsWith('--'));

if (!targetPath) {
    console.error('Usage: npx tsx scripts/convert-interfaces-to-types-v2.ts <file-or-directory> [--dry-run]');
    process.exit(1);
}

convertInterfacesToTypes(targetPath, dryRun).catch(error => {
    console.error('Conversion failed:', error);
    process.exit(1);
});
