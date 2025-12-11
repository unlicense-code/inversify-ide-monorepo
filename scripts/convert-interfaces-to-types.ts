#!/usr/bin/env node
/**
 * Convert all interfaces to types using ts-morph
 * 
 * This script uses ts-morph to perform AST-aware transformations:
 * - Converts `interface` declarations to `type` declarations
 * - Handles `extends` clauses by converting to intersection types
 * - Preserves all modifiers (export, default, etc.)
 * - Maintains formatting and comments
 * 
 * Usage: 
 *   npx tsx scripts/convert-interfaces-to-types.ts <file-or-directory> [--dry-run]
 */

import { Project, SyntaxKind, Node, InterfaceDeclaration, SourceFile, TypeNode, HeritageClause, TypeElement } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const import.meta.dirname = path.dirname(__filename);

type ConversionStats = {
    filesProcessed: number;
    filesModified: number;
    interfacesConverted: number;
}

class InterfaceToTypeConverter {
    private project: Project;
    private stats: ConversionStats;
    private dryRun: boolean;

    constructor(dryRun: boolean = false) {
        this.dryRun = dryRun;
        this.stats = {
            filesProcessed: 0,
            filesModified: 0,
            interfacesConverted: 0
        };

        // Initialize ts-morph project
        this.project = new Project({
            tsConfigFilePath: path.join(import.meta.dirname, '../tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
        });
    }

    /**
     * Convert interfaces in a single file or directory
     */
    async convert(targetPath: string): Promise<void> {
        const fullPath = path.resolve(targetPath);
        console.log(`Processing: ${fullPath}`);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Path does not exist: ${fullPath}`);
        }

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            await this.convertDirectory(fullPath);
        } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
            await this.convertFile(fullPath);
        } else {
            throw new Error(`Invalid target: ${fullPath}. Must be a TypeScript file or directory.`);
        }

        this.printStats();
    }

    /**
     * Convert all TypeScript files in a directory
     */
    private async convertDirectory(dirPath: string): Promise<void> {
        const files = this.findTypeScriptFiles(dirPath);
        console.log(`Found ${files.length} TypeScript files in ${dirPath}`);

        for (const file of files) {
            try {
                await this.convertFile(file);
            } catch (error) {
                console.error(`Error converting ${file}:`, error);
            }
        }
    }

    /**
     * Find all TypeScript files recursively
     */
    private findTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                // Skip node_modules, lib, dist, .git, etc.
                if (!['node_modules', 'lib', 'dist', '.git', '.vscode', '.theia', '.github'].includes(file)) {
                    this.findTypeScriptFiles(filePath, fileList);
                }
            } else if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !file.endsWith('.d.ts')) {
                fileList.push(filePath);
            }
        });

        return fileList;
    }

    /**
     * Convert interfaces in a single file
     */
    private async convertFile(filePath: string): Promise<void> {
        this.stats.filesProcessed++;

        try {
            // Add source file to project
            const sourceFile = this.project.addSourceFileAtPath(filePath);
            let modified = false;

            // Get all interfaces
            const interfaces = sourceFile.getInterfaces();

            if (interfaces.length === 0) {
                console.log(`  ⏭️  No interfaces found: ${filePath}`);
                return;
            }

            console.log(`  📝 Found ${interfaces.length} interface(s) in: ${filePath}`);

            // Convert each interface
            for (const interfaceDecl of interfaces) {
                try {
                    const result = this.convertInterface(interfaceDecl);
                    modified = result || modified;
                    this.stats.interfacesConverted++;
                } catch (error) {
                    console.error(`    Error converting interface ${interfaceDecl.getName()}:`, error);
                }
            }

            if (modified) {
                this.stats.filesModified++;

                if (!this.dryRun) {
                    // Save changes
                    sourceFile.saveSync();
                    console.log(`  ✅ Converted: ${filePath}`);
                } else {
                    console.log(`  [DRY RUN] Would convert: ${filePath}`);
                }
            }
        } catch (error) {
            console.error(`  ❌ Error processing ${filePath}:`, error);
            if (error instanceof Error) {
                console.error(`    ${error.message}`);
                if (error.stack) {
                    console.error(`    ${error.stack.split('\n').slice(0, 3).join('\n    ')}`);
                }
            }
        }
    }

    /**
     * Convert a single interface to a type
     */
    private convertInterface(interfaceDecl: InterfaceDeclaration): boolean {
        try {
            // Get interface properties
            const name = interfaceDecl.getName();
            const isExported = interfaceDecl.isExported();
            const isDefaultExport = interfaceDecl.isDefaultExport();
            const typeParameters = interfaceDecl.getTypeParameters();

            // Get extends clauses
            const heritageClauses = interfaceDecl.getHeritageClauses();
            const extendsTypes: string[] = [];

            if (heritageClauses.length > 0) {
                for (const clause of heritageClauses) {
                    if (clause.getToken() === SyntaxKind.ExtendsKeyword) {
                        const types = clause.getTypeNodes();
                        for (const typeNode of types) {
                            extendsTypes.push(typeNode.getText());
                        }
                    }
                }
            }

            // Get the body content (everything between the braces)
            const openBrace = interfaceDecl.getOpenBraceToken();
            const closeBrace = interfaceDecl.getCloseBraceToken();
            let bodyContent = '';

            if (openBrace && closeBrace) {
                const sourceFile = interfaceDecl.getSourceFile();
                const start = openBrace.getEnd();
                const end = closeBrace.getStart();
                bodyContent = sourceFile.getFullText().substring(start, end);
            }

            // Build the type declaration
            let typeText = '';

            // Add export/default export
            if (isDefaultExport) {
                typeText += 'export default ';
            } else if (isExported) {
                typeText += 'export ';
            }

            typeText += 'type ';
            typeText += name;

            // Add type parameters
            if (typeParameters.length > 0) {
                const params = typeParameters.map(p => p.getText()).join(', ');
                typeText += `<${params}>`;
            }

            typeText += ' = ';

            // Add extends types as intersection
            if (extendsTypes.length > 0) {
                typeText += extendsTypes.join(' & ') + ' & ';
            }

            // Add the object type with preserved body
            typeText += '{' + bodyContent + '}';

            // Replace the interface with the type
            interfaceDecl.replaceWithText(typeText);

            return true;
        } catch (error) {
            console.error(`Error converting interface ${interfaceDecl.getName()}:`, error);
            return false;
        }
    }

    /**
     * Print conversion statistics
     */
    private printStats(): void {
        console.log('\n📊 Conversion Statistics:');
        console.log(`  Files processed: ${this.stats.filesProcessed}`);
        console.log(`  Files modified: ${this.stats.filesModified}`);
        console.log(`  Interfaces converted: ${this.stats.interfacesConverted}`);

        if (this.dryRun) {
            console.log('\n⚠️  DRY RUN MODE - No files were modified');
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const targetPath = args.find(arg => !arg.startsWith('--'));

    if (!targetPath) {
        console.error('Usage: npx tsx scripts/convert-interfaces-to-types.ts <file-or-directory> [--dry-run]');
        process.exit(1);
    }

    const converter = new InterfaceToTypeConverter(dryRun);

    try {
        await converter.convert(targetPath);
        console.log('\n✅ Conversion complete!');
    } catch (error) {
        console.error('Conversion failed:', error);
        process.exit(1);
    }
}

// Run main
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});

export { InterfaceToTypeConverter };
