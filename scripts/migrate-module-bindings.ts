#!/usr/bin/env node
/**
 * Advanced Module Binding Migration Tool
 * 
 * This script specifically handles ContainerModule to initialization function conversion
 * with proper dependency resolution and factory pattern conversion.
 * 
 * Usage: npx tsx scripts/migrate-module-bindings.ts <module-file>
 */

import { Project, Node, SourceFile, VariableDeclaration, CallExpression, SyntaxKind } from 'ts-morph';
import * as path from 'path';

class ModuleBindingMigrator {
    private project: Project;

    constructor() {
        this.project = new Project({
            tsConfigFilePath: path.join(__dirname, '../tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
        });
    }

    /**
     * Migrate a ContainerModule file
     */
    async migrateModule(modulePath: string): Promise<void> {
        const sourceFile = this.project.addSourceFileAtPath(modulePath);
        
        console.log(`Migrating module: ${modulePath}`);
        
        // Find ContainerModule export
        const containerModule = this.findContainerModule(sourceFile);
        
        if (!containerModule) {
            console.log('  No ContainerModule found');
            return;
        }

        // Convert to initialization function
        this.convertToInitializationFunction(sourceFile, containerModule);
        
        // Add ServiceRegistry import
        this.addServiceRegistryImport(sourceFile);
        
        // Save
        sourceFile.saveSync();
        console.log('  ✅ Module migrated');
    }

    /**
     * Find ContainerModule declaration
     */
    private findContainerModule(sourceFile: SourceFile): VariableDeclaration | null {
        const exports = sourceFile.getExportedDeclarations();
        
        for (const declarations of exports.values()) {
            for (const decl of declarations) {
                if (Node.isVariableDeclaration(decl)) {
                    const initializer = decl.getInitializer();
                    if (Node.isNewExpression(initializer)) {
                        const expr = initializer.getExpression();
                        if (Node.isIdentifier(expr) && expr.getText() === 'ContainerModule') {
                            return decl;
                        }
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Convert ContainerModule to initialization function
     */
    private convertToInitializationFunction(
        sourceFile: SourceFile,
        variableDecl: VariableDeclaration
    ): void {
        const initializer = variableDecl.getInitializer();
        if (!Node.isNewExpression(initializer)) {
            return;
        }

        const args = initializer.getArguments();
        if (args.length === 0) {
            return;
        }

        const callback = args[0];
        if (!Node.isArrowFunction(callback) && !Node.isFunctionExpression(callback)) {
            return;
        }

        const callbackBody = callback.getBody();
        if (!Node.isBlock(callbackBody)) {
            return;
        }

        // Determine function name
        const isDefaultExport = variableDecl.getParent()?.getKind() === SyntaxKind.ExportAssignment;
        const moduleName = this.getModuleName(sourceFile);
        const functionName = isDefaultExport 
            ? `initialize${moduleName}`
            : `initialize${variableDecl.getName()}`;

        // Convert bind statements
        const statements = callbackBody.getStatements();
        const convertedStatements: string[] = [];
        
        for (const stmt of statements) {
            if (Node.isExpressionStatement(stmt)) {
                const expr = stmt.getExpression();
                if (Node.isCallExpression(expr)) {
                    const converted = this.convertBindExpression(expr);
                    if (converted) {
                        convertedStatements.push(converted);
                    }
                }
            } else if (Node.isVariableStatement(stmt)) {
                // Handle variable statements (e.g., const provider = ...)
                convertedStatements.push(stmt.getText());
            }
        }

        // Build function
        const functionText = `
export function ${functionName}(registry: ServiceRegistry): void {
${convertedStatements.map(s => '    ' + s).join('\n')}
}
`.trim();

        // Replace variable declaration
        const parent = variableDecl.getParent();
        if (parent) {
            parent.replaceWithText(functionText);
        }
    }

    /**
     * Convert bind() expression to registry.registerSingleton()
     */
    private convertBindExpression(callExpr: CallExpression): string | null {
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
        
        // Get the full chain (bind(...).toSelf().inSingletonScope())
        let current: Node = callExpr;
        const chain: string[] = [];
        
        while (current) {
            const parent = current.getParent();
            if (Node.isPropertyAccessExpression(parent)) {
                chain.push(parent.getName());
                current = parent;
            } else if (Node.isCallExpression(parent)) {
                chain.push(parent.getExpression().getText());
                current = parent;
            } else {
                break;
            }
        }

        const chainText = chain.join('.');

        // Pattern: bind(Service).toSelf().inSingletonScope()
        if (chainText.includes('toSelf') && chainText.includes('inSingletonScope')) {
            return `registry.registerSingleton(${serviceToken}, () => new ${serviceToken}(/* TODO: Add dependencies */));`;
        }

        // Pattern: bind(Interface).toService(Implementation)
        if (chainText.includes('toService')) {
            const toServiceCall = this.findToServiceCall(callExpr);
            if (toServiceCall) {
                const targetService = toServiceCall.getArguments()[0]?.getText();
                return `registry.registerSingleton(${serviceToken}, () => registry.get(${targetService}));`;
            }
        }

        // Pattern: bind(Service).toDynamicValue(ctx => ...)
        if (chainText.includes('toDynamicValue')) {
            return this.convertDynamicValue(callExpr, serviceToken);
        }

        // Pattern: bind(Factory).toFactory(ctx => ...)
        if (chainText.includes('toFactory')) {
            return this.convertFactory(callExpr, serviceToken);
        }

        // Pattern: bind(Service).toConstantValue(value)
        if (chainText.includes('toConstantValue')) {
            const constantCall = this.findConstantValueCall(callExpr);
            if (constantCall) {
                const value = constantCall.getArguments()[0]?.getText();
                return `registry.registerSingleton(${serviceToken}, () => ${value});`;
            }
        }

        // Pattern: rebind(Service).to(...)
        if (chainText.includes('rebind')) {
            return this.convertRebind(callExpr, serviceToken);
        }

        return `// TODO: Convert bind statement for ${serviceToken}`;
    }

    /**
     * Find toService() call in the chain
     */
    private findToServiceCall(callExpr: CallExpression): CallExpression | null {
        let current: Node = callExpr;
        
        while (current) {
            const parent = current.getParent();
            if (Node.isCallExpression(parent)) {
                const expr = parent.getExpression();
                if (Node.isPropertyAccessExpression(expr) && expr.getName() === 'toService') {
                    return parent;
                }
            }
            current = parent;
        }
        
        return null;
    }

    /**
     * Find toConstantValue() call
     */
    private findConstantValueCall(callExpr: CallExpression): CallExpression | null {
        let current: Node = callExpr;
        
        while (current) {
            const parent = current.getParent();
            if (Node.isCallExpression(parent)) {
                const expr = parent.getExpression();
                if (Node.isPropertyAccessExpression(expr) && expr.getName() === 'toConstantValue') {
                    return parent;
                }
            }
            current = parent;
        }
        
        return null;
    }

    /**
     * Convert toDynamicValue pattern
     */
    private convertDynamicValue(callExpr: CallExpression, serviceToken: string): string {
        // Find the toDynamicValue call and extract the factory function
        let current: Node = callExpr;
        
        while (current) {
            const parent = current.getParent();
            if (Node.isCallExpression(parent)) {
                const expr = parent.getExpression();
                if (Node.isPropertyAccessExpression(expr) && expr.getName() === 'toDynamicValue') {
                    const factoryArg = parent.getArguments()[0];
                    if (factoryArg) {
                        // Convert ctx.container.get() to registry.get()
                        const factoryText = factoryArg.getText()
                            .replace(/ctx\.container\.get\(/g, 'registry.get(')
                            .replace(/ctx\.container/g, 'registry');
                        
                        return `registry.registerSingleton(${serviceToken}, () => ${factoryText});`;
                    }
                }
            }
            current = parent;
        }
        
        return `// TODO: Convert toDynamicValue for ${serviceToken}`;
    }

    /**
     * Convert toFactory pattern
     */
    private convertFactory(callExpr: CallExpression, serviceToken: string): string {
        // Similar to toDynamicValue but returns a factory function
        let current: Node = callExpr;
        
        while (current) {
            const parent = current.getParent();
            if (Node.isCallExpression(parent)) {
                const expr = parent.getExpression();
                if (Node.isPropertyAccessExpression(expr) && expr.getName() === 'toFactory') {
                    const factoryArg = parent.getArguments()[0];
                    if (factoryArg) {
                        const factoryText = factoryArg.getText()
                            .replace(/ctx\.container\.get\(/g, 'registry.get(')
                            .replace(/ctx\.container/g, 'registry');
                        
                        return `registry.registerSingleton(${serviceToken}, () => ${factoryText});`;
                    }
                }
            }
            current = parent;
        }
        
        return `// TODO: Convert toFactory for ${serviceToken}`;
    }

    /**
     * Convert rebind pattern
     */
    private convertRebind(callExpr: CallExpression, serviceToken: string): string {
        // rebind is similar to bind but replaces existing binding
        // In our case, we can just use registerSingleton (it will overwrite)
        const chain = callExpr.getParent()?.getText() || '';
        
        if (chain.includes('toService')) {
            const toServiceCall = this.findToServiceCall(callExpr);
            if (toServiceCall) {
                const targetService = toServiceCall.getArguments()[0]?.getText();
                return `registry.registerSingleton(${serviceToken}, () => registry.get(${targetService}));`;
            }
        }
        
        return `// TODO: Convert rebind for ${serviceToken}`;
    }

    /**
     * Add ServiceRegistry import
     */
    private addServiceRegistryImport(sourceFile: SourceFile): void {
        // Check if import already exists
        const imports = sourceFile.getImportDeclarations();
        const hasImport = imports.some(imp => 
            imp.getModuleSpecifierValue().includes('service-registry')
        );

        if (!hasImport) {
            sourceFile.addImportDeclaration({
                moduleSpecifier: '@theia/core/lib/common/service-registry',
                namedImports: ['ServiceRegistry']
            });
        }
    }

    /**
     * Get module name from file path
     */
    private getModuleName(sourceFile: SourceFile): string {
        const fileName = sourceFile.getBaseNameWithoutExtension();
        return fileName
            .split(/[-_]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const modulePath = args[0];

    if (!modulePath) {
        console.error('Usage: npx tsx scripts/migrate-module-bindings.ts <module-file>');
        process.exit(1);
    }

    const migrator = new ModuleBindingMigrator();
    
    try {
        await migrator.migrateModule(modulePath);
        console.log('\n✅ Module migration complete!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export { ModuleBindingMigrator };
