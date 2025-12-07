#!/usr/bin/env node
/**
 * Inversify to ES Modules Migration Tool using ts-morph
 * 
 * This script uses ts-morph to perform AST-aware transformations:
 * - Removes @injectable() decorators
 * - Converts @inject() properties to constructor parameters
 * - Removes @postConstruct() decorators
 * - Removes inversify imports
 * - Updates ContainerModule to initialization functions
 * 
 * Usage: 
 *   npx tsx scripts/migrate-inversify-tsmorph.ts <file-or-directory> [--dry-run]
 */

import { Project, SyntaxKind, Node, ClassDeclaration, PropertyDeclaration, ConstructorDeclaration, Decorator, SourceFile, VariableDeclaration, CallExpression } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

interface MigrationStats {
    filesProcessed: number;
    filesModified: number;
    classesMigrated: number;
    modulesMigrated: number;
    propertiesConverted: number;
    decoratorsRemoved: number;
}

class InversifyMigrator {
    private project: Project;
    private stats: MigrationStats;
    private dryRun: boolean;

    constructor(dryRun: boolean = false) {
        this.dryRun = dryRun;
        this.stats = {
            filesProcessed: 0,
            filesModified: 0,
            classesMigrated: 0,
            modulesMigrated: 0,
            propertiesConverted: 0,
            decoratorsRemoved: 0
        };

        // Initialize ts-morph project
        this.project = new Project({
            tsConfigFilePath: path.join(__dirname, '../tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
        });
    }

    /**
     * Migrate a single file or directory
     */
    async migrate(targetPath: string): Promise<void> {
        const fullPath = path.resolve(targetPath);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            await this.migrateDirectory(fullPath);
        } else if (stat.isFile() && fullPath.endsWith('.ts')) {
            await this.migrateFile(fullPath);
        } else {
            throw new Error(`Invalid target: ${fullPath}. Must be a TypeScript file or directory.`);
        }

        this.printStats();
    }

    /**
     * Migrate all TypeScript files in a directory
     */
    private async migrateDirectory(dirPath: string): Promise<void> {
        const files = this.findTypeScriptFiles(dirPath);
        console.log(`Found ${files.length} TypeScript files in ${dirPath}`);

        for (const file of files) {
            try {
                await this.migrateFile(file);
            } catch (error) {
                console.error(`Error migrating ${file}:`, error);
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
                if (!['node_modules', 'lib', 'dist', '.git', '.vscode', '.theia'].includes(file)) {
                    this.findTypeScriptFiles(filePath, fileList);
                }
            } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
                fileList.push(filePath);
            }
        });

        return fileList;
    }

    /**
     * Migrate a single file
     */
    private async migrateFile(filePath: string): Promise<void> {
        this.stats.filesProcessed++;

        // Add source file to project
        const sourceFile = this.project.addSourceFileAtPath(filePath);
        let modified = false;

        // 1. Remove inversify imports
        modified = this.removeInversifyImports(sourceFile) || modified;

        // 2. Migrate ContainerModule exports
        modified = this.migrateContainerModule(sourceFile) || modified;

        // 3. Migrate classes with @injectable()
        modified = this.migrateInjectableClasses(sourceFile) || modified;

        // 4. Remove unused imports
        this.removeUnusedImports(sourceFile);

        if (modified) {
            this.stats.filesModified++;
            
            if (!this.dryRun) {
                // Create backup
                const backupPath = filePath + '.inversify-backup';
                fs.copyFileSync(filePath, backupPath);
                console.log(`  Backup: ${backupPath}`);

                // Save changes
                sourceFile.saveSync();
                console.log(`  ✅ Migrated: ${filePath}`);
            } else {
                console.log(`  [DRY RUN] Would migrate: ${filePath}`);
            }
        } else {
            console.log(`  ⏭️  No changes: ${filePath}`);
        }
    }

    /**
     * Remove inversify imports
     */
    private removeInversifyImports(sourceFile: SourceFile): boolean {
        let modified = false;
        const imports = sourceFile.getImportDeclarations();

        for (const importDecl of imports) {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();
            
            if (moduleSpecifier.includes('inversify') || 
                moduleSpecifier === '@theia/core/shared/inversify') {
                importDecl.remove();
                modified = true;
                this.stats.decoratorsRemoved++;
            }
        }

        return modified;
    }

    /**
     * Migrate ContainerModule to initialization function
     */
    private migrateContainerModule(sourceFile: SourceFile): boolean {
        let modified = false;
        const exports = sourceFile.getExportedDeclarations();

        for (const [name, declarations] of exports) {
            for (const declaration of declarations) {
                if (Node.isVariableDeclaration(declaration)) {
                    const initializer = declaration.getInitializer();
                    
                    if (Node.isNewExpression(initializer)) {
                        const expression = initializer.getExpression();
                        
                        if (Node.isIdentifier(expression) && 
                            expression.getText() === 'ContainerModule') {
                            modified = this.convertContainerModuleToFunction(
                                sourceFile,
                                declaration
                            ) || modified;
                            this.stats.modulesMigrated++;
                        }
                    }
                }
            }
        }

        return modified;
    }

    /**
     * Convert ContainerModule to initialization function
     */
    private convertContainerModuleToFunction(
        sourceFile: SourceFile,
        variableDecl: VariableDeclaration
    ): boolean {
        const initializer = variableDecl.getInitializer();
        if (!Node.isNewExpression(initializer)) {
            return false;
        }

        const args = initializer.getArguments();
        if (args.length === 0) {
            return false;
        }

        const callback = args[0];
        if (!Node.isArrowFunction(callback) && !Node.isFunctionExpression(callback)) {
            return false;
        }

        // Get the variable name (usually default export)
        const variableName = variableDecl.getName();
        const isDefaultExport = variableDecl.getParent()?.getKind() === SyntaxKind.ExportAssignment;

        // Extract bind statements from callback body
        const callbackBody = callback.getBody();
        if (!Node.isBlock(callbackBody)) {
            return false;
        }

        // Create new function
        const functionName = isDefaultExport 
            ? `initialize${this.getModuleName(sourceFile)}`
            : `initialize${variableName.charAt(0).toUpperCase() + variableName.slice(1)}`;

        // Build function body by converting bind() calls to registry.registerSingleton()
        const statements = callbackBody.getStatements();
        const newStatements: string[] = [];
        
        for (const stmt of statements) {
            if (Node.isExpressionStatement(stmt)) {
                const expr = stmt.getExpression();
                if (Node.isCallExpression(expr)) {
                    const converted = this.convertBindStatement(expr);
                    if (converted) {
                        newStatements.push(converted);
                    }
                }
            }
        }

        // Create function declaration
        const functionText = `
export function ${functionName}(registry: ServiceRegistry): void {
${newStatements.map(s => '    ' + s).join('\n')}
}
`.trim();

        // Replace the variable declaration
        const parent = variableDecl.getParent();
        if (parent) {
            parent.replaceWithText(functionText);
            return true;
        }

        return false;
    }

    /**
     * Convert a bind() statement to registry.registerSingleton()
     */
    private convertBindStatement(callExpr: CallExpression): string | null {
        const expression = callExpr.getExpression();
        if (!Node.isPropertyAccessExpression(expression)) {
            return null;
        }

        const name = expression.getName();
        if (name !== 'bind') {
            return null;
        }

        const args = callExpr.getArguments();
        if (args.length === 0) {
            return null;
        }

        const serviceToken = args[0].getText();
        const chain = callExpr.getParent();
        
        // Check for .toSelf().inSingletonScope() pattern
        if (Node.isPropertyAccessExpression(chain)) {
            const chainText = chain.getText();
            
            if (chainText.includes('toSelf') && chainText.includes('inSingletonScope')) {
                // Simple singleton registration
                return `registry.registerSingleton(${serviceToken}, () => new ${serviceToken}(/* TODO: Add dependencies */));`;
            } else if (chainText.includes('toService')) {
                // Service alias
                const toServiceCall = chain.getParent();
                if (Node.isCallExpression(toServiceCall)) {
                    const targetService = toServiceCall.getArguments()[0]?.getText();
                    return `registry.registerSingleton(${serviceToken}, () => registry.get(${targetService}));`;
                }
            } else if (chainText.includes('toDynamicValue')) {
                // Dynamic value - needs manual conversion
                return `// TODO: Convert toDynamicValue for ${serviceToken}`;
            }
        }

        return null;
    }

    /**
     * Migrate classes decorated with @injectable()
     */
    private migrateInjectableClasses(sourceFile: SourceFile): boolean {
        let modified = false;
        const classes = sourceFile.getClasses();

        for (const classDecl of classes) {
            if (this.hasInjectableDecorator(classDecl)) {
                modified = this.migrateClass(classDecl) || modified;
                this.stats.classesMigrated++;
            }
        }

        return modified;
    }

    /**
     * Check if class has @injectable() decorator
     */
    private hasInjectableDecorator(classDecl: ClassDeclaration): boolean {
        const decorators = classDecl.getDecorators();
        return decorators.some(d => {
            const expr = d.getExpression();
            return Node.isCallExpression(expr) && 
                   expr.getExpression().getText() === 'injectable';
        });
    }

    /**
     * Migrate a single class
     */
    private migrateClass(classDecl: ClassDeclaration): boolean {
        let modified = false;

        // 1. Remove @injectable() decorator
        const decorators = classDecl.getDecorators();
        for (const decorator of decorators) {
            const expr = decorator.getExpression();
            if (Node.isCallExpression(expr) && expr.getExpression().getText() === 'injectable') {
                decorator.remove();
                modified = true;
                this.stats.decoratorsRemoved++;
            }
        }

        // 2. Convert @inject() properties to constructor parameters
        const injectedProperties = this.getInjectedProperties(classDecl);
        if (injectedProperties.length > 0) {
            modified = this.convertPropertiesToConstructor(classDecl, injectedProperties) || modified;
            this.stats.propertiesConverted += injectedProperties.length;
        }

        // 3. Handle @postConstruct()
        modified = this.handlePostConstruct(classDecl) || modified;

        return modified;
    }

    /**
     * Get all properties with @inject() decorator
     */
    private getInjectedProperties(classDecl: ClassDeclaration): PropertyDeclaration[] {
        const properties = classDecl.getProperties();
        return properties.filter(prop => {
            const decorators = prop.getDecorators();
            return decorators.some(d => {
                const expr = d.getExpression();
                return Node.isCallExpression(expr) && 
                       expr.getExpression().getText() === 'inject';
            });
        });
    }

    /**
     * Convert injected properties to constructor parameters
     */
    private convertPropertiesToConstructor(
        classDecl: ClassDeclaration,
        injectedProperties: PropertyDeclaration[]
    ): boolean {
        // Get existing constructor or create new one
        let constructor = classDecl.getConstructors()[0];

        // Extract property information
        const constructorParams: string[] = [];
        
        for (const prop of injectedProperties) {
            const decorators = prop.getDecorators();
            const injectDecorator = decorators.find(d => {
                const expr = d.getExpression();
                return Node.isCallExpression(expr) && 
                       expr.getExpression().getText() === 'inject';
            });

            if (!injectDecorator) continue;

            // Get property details
            const name = prop.getName();
            const type = prop.getTypeNode()?.getText() || 'any';
            const modifiers = prop.getModifiers().map(m => m.getText());
            const isReadonly = modifiers.includes('readonly');
            const isProtected = modifiers.includes('protected');
            const isOptional = prop.hasQuestionToken();

            // Get inject token if available
            const injectExpr = injectDecorator.getExpression();
            let injectToken: string | undefined;
            if (Node.isCallExpression(injectExpr)) {
                const tokenArg = injectExpr.getArguments()[0];
                if (tokenArg) {
                    injectToken = tokenArg.getText();
                }
            }

            // Build parameter
            const paramModifiers = [];
            if (isProtected) paramModifiers.push('protected');
            if (isReadonly) paramModifiers.push('readonly');
            
            const paramText = `${paramModifiers.join(' ')} ${name}${isOptional ? '?' : ''}: ${type}`.trim();
            constructorParams.push(paramText);

            // Remove the property
            prop.remove();
        }

        if (constructorParams.length === 0) {
            return false;
        }

        // Update or create constructor
        if (constructor) {
            // Add new parameters to existing constructor
            const existingParams = constructor.getParameters();
            const existingParamTexts = existingParams.map(p => p.getText());
            
            // Combine existing and new parameters
            const allParams = [...existingParamTexts, ...constructorParams];
            const paramsText = allParams.join(', ');
            
            const body = constructor.getBody()?.getText() || '{}';
            constructor.replaceWithText(`constructor(${paramsText}) ${body}`);
        } else {
            // Create new constructor
            const paramsText = constructorParams.join(', ');
            const firstMember = classDecl.getMembers()[0];
            if (firstMember) {
                firstMember.insertBeforeText(`constructor(${paramsText) {}\n\n    `);
            } else {
                classDecl.addConstructor({
                    parameters: constructorParams.map(p => {
                        // Parse parameter text (simplified)
                        const match = p.match(/(\w+)\??:\s*(\w+)/);
                        if (match) {
                            return {
                                name: match[1],
                                type: match[2],
                                isOptional: p.includes('?'),
                                isReadonly: p.includes('readonly'),
                                scope: p.includes('protected') ? 'protected' : undefined
                            };
                        }
                        return { name: 'param', type: 'any' };
                    })
                });
            }
        }

        return true;
    }

    /**
     * Handle @postConstruct() decorator
     */
    private handlePostConstruct(classDecl: ClassDeclaration): boolean {
        let modified = false;
        const methods = classDecl.getMethods();

        for (const method of methods) {
            const decorators = method.getDecorators();
            const postConstruct = decorators.find(d => {
                const expr = d.getExpression();
                return Node.isCallExpression(expr) && 
                       expr.getExpression().getText() === 'postConstruct';
            });

            if (postConstruct) {
                // Remove decorator
                postConstruct.remove();
                modified = true;
                this.stats.decoratorsRemoved++;

                // If method is named 'init', call it in constructor
                if (method.getName() === 'init') {
                    const constructor = classDecl.getConstructors()[0];
                    if (constructor) {
                        const body = constructor.getBody();
                        if (body) {
                            const statements = body.getStatements();
                            // Check if init() call already exists
                            const hasInitCall = statements.some(s => 
                                s.getText().includes('this.init()')
                            );
                            
                            if (!hasInitCall) {
                                body.insertStatements(0, 'this.init();');
                            }
                        }
                    }
                }
            }
        }

        return modified;
    }

    /**
     * Remove unused imports
     */
    private removeUnusedImports(sourceFile: SourceFile): void {
        // ts-morph can detect unused imports, but this is a simplified version
        // In a full implementation, you'd check if imported symbols are actually used
    }

    /**
     * Get module name from file path
     */
    private getModuleName(sourceFile: SourceFile): string {
        const fileName = sourceFile.getBaseNameWithoutExtension();
        // Convert kebab-case or snake_case to PascalCase
        return fileName
            .split(/[-_]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
    }

    /**
     * Print migration statistics
     */
    private printStats(): void {
        console.log('\n📊 Migration Statistics:');
        console.log(`  Files processed: ${this.stats.filesProcessed}`);
        console.log(`  Files modified: ${this.stats.filesModified}`);
        console.log(`  Classes migrated: ${this.stats.classesMigrated}`);
        console.log(`  Modules migrated: ${this.stats.modulesMigrated}`);
        console.log(`  Properties converted: ${this.stats.propertiesConverted}`);
        console.log(`  Decorators removed: ${this.stats.decoratorsRemoved}`);
        
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
        console.error('Usage: npx tsx scripts/migrate-inversify-tsmorph.ts <file-or-directory> [--dry-run]');
        process.exit(1);
    }

    const migrator = new InversifyMigrator(dryRun);
    
    try {
        await migrator.migrate(targetPath);
        console.log('\n✅ Migration complete!');
        console.log('⚠️  Remember to:');
        console.log('   1. Review all changes manually');
        console.log('   2. Complete constructor parameter dependencies');
        console.log('   3. Update module initialization functions');
        console.log('   4. Update tests');
        console.log('   5. Remove backup files after verification');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export { InversifyMigrator };
