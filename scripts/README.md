# Inversify Migration Scripts

This directory contains automated migration tools using ts-morph for AST-aware code transformations.

## Prerequisites

```bash
npm install --save-dev ts-morph tsx
```

## Scripts

### 1. migrate-inversify-tsmorph.ts

Main migration tool that handles:
- Removing `@injectable()` decorators
- Converting `@inject()` properties to constructor parameters
- Removing `@postConstruct()` decorators
- Removing inversify imports
- Basic class transformations

**Usage:**
```bash
# Dry run (preview changes)
npx tsx scripts/migrate-inversify-tsmorph.ts packages/workspace/src --dry-run

# Actual migration
npx tsx scripts/migrate-inversify-tsmorph.ts packages/workspace/src
```

**What it does:**
- Processes all `.ts` files in the target directory
- Creates `.inversify-backup` files before modifying
- Removes decorators and converts properties to constructor parameters
- Preserves code structure and formatting

**Limitations:**
- Constructor dependencies need manual completion (marked with `/* TODO: Add dependencies */`)
- Complex bind patterns may need manual conversion
- Module bindings should be handled separately with `migrate-module-bindings.ts`

### 2. migrate-module-bindings.ts

Specialized tool for converting `ContainerModule` exports to initialization functions.

**Usage:**
```bash
npx tsx scripts/migrate-module-bindings.ts packages/workspace/src/browser/workspace-frontend-module.ts
```

**What it does:**
- Converts `export default new ContainerModule(...)` to `export function initializeModule(registry: ServiceRegistry): void`
- Converts `bind().toSelf().inSingletonScope()` to `registry.registerSingleton()`
- Converts `bind().toService()` to registry aliases
- Handles `toDynamicValue()` and `toFactory()` patterns
- Adds `ServiceRegistry` import

**Patterns handled:**
- ✅ `bind(Service).toSelf().inSingletonScope()`
- ✅ `bind(Interface).toService(Implementation)`
- ✅ `bind(Service).toConstantValue(value)`
- ✅ `bind(Service).toDynamicValue(ctx => ...)`
- ✅ `bind(Factory).toFactory(ctx => ...)`
- ✅ `rebind(Service).toService(...)`

## Migration Workflow

### Phase 1: Automated Migration

1. **Run class migration:**
   ```bash
   npx tsx scripts/migrate-inversify-tsmorph.ts packages/workspace/src --dry-run
   ```
   
2. **Review the changes**, then run without `--dry-run`:
   ```bash
   npx tsx scripts/migrate-inversify-tsmorph.ts packages/workspace/src
   ```

3. **Run module binding migration:**
   ```bash
   npx tsx scripts/migrate-module-bindings.ts packages/workspace/src/browser/workspace-frontend-module.ts
   ```

### Phase 2: Manual Completion

After automated migration, you need to:

1. **Complete constructor dependencies:**
   - Find all `/* TODO: Add dependencies */` comments
   - Add proper dependency parameters from registry
   - Example:
     ```typescript
     // Before
     registry.registerSingleton(WorkspaceService, () => 
         new WorkspaceService(/* TODO: Add dependencies */)
     );
     
     // After
     registry.registerSingleton(WorkspaceService, () => {
         const fileService = registry.get(FileService);
         const workspaceServer = registry.get(WorkspaceServer);
         return new WorkspaceService(fileService, workspaceServer);
     });
     ```

2. **Update module initialization:**
   - Ensure all dependencies are registered before services that use them
   - Handle circular dependencies explicitly
   - Add proper error handling

3. **Update tests:**
   - Replace `Container` with `ServiceRegistry`
   - Update test setup code
   - Verify all tests pass

4. **Clean up:**
   - Remove `.inversify-backup` files after verification
   - Remove inversify from `package.json`
   - Update imports

## Example Output

### Before:
```typescript
import { injectable, inject } from '@theia/core/shared/inversify';

@injectable()
export class WorkspaceService {
    @inject(FileService)
    protected readonly fileService: FileService;
}
```

### After:
```typescript
export class WorkspaceService {
    constructor(
        protected readonly fileService: FileService
    ) {}
}
```

## Troubleshooting

### "Service not registered" errors
- Ensure dependencies are registered before services that use them
- Check module initialization order

### Circular dependency warnings
- Refactor to break cycles
- Use lazy initialization where needed

### Type errors
- Ensure all imports are updated
- Check that ServiceRegistry types are correct
- Verify constructor parameter types match

## Best Practices

1. **Always use `--dry-run` first** to preview changes
2. **Commit after each package** migration for easier rollback
3. **Review automated changes** - ts-morph is smart but not perfect
4. **Test incrementally** - don't migrate everything at once
5. **Keep backups** until migration is verified

## Limitations

- Complex factory patterns may need manual conversion
- ContributionProvider patterns need special handling
- Named bindings require manual conversion to ContributionCollection
- Some edge cases in decorator usage may not be handled

## Contributing

When improving these scripts:
- Test on real Theia codebase
- Handle edge cases gracefully
- Provide clear error messages
- Preserve code formatting where possible
