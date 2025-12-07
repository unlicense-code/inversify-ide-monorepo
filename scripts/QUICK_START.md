# Quick Start: Inversify Migration with ts-morph

## Installation

```bash
cd universal-git/worktrees/theia
npm install --save-dev ts-morph tsx
```

## Basic Usage

### 1. Migrate a Single Package (Recommended)

Start with a small package to test the process:

```bash
# Step 1: Preview changes (dry run)
npx tsx scripts/migrate-inversify-tsmorph.ts packages/workspace/src --dry-run

# Step 2: Review the output, then run actual migration
npx tsx scripts/migrate-inversify-tsmorph.ts packages/workspace/src

# Step 3: Migrate module files
npx tsx scripts/migrate-module-bindings.ts packages/workspace/src/browser/workspace-frontend-module.ts
npx tsx scripts/migrate-module-bindings.ts packages/workspace/src/node/workspace-backend-module.ts
```

### 2. Complete Manual Steps

After automated migration:

1. **Complete constructor dependencies:**
   ```typescript
   // Find and replace TODO comments
   // Before:
   registry.registerSingleton(Service, () => new Service(/* TODO: Add dependencies */));
   
   // After:
   registry.registerSingleton(Service, () => {
       const dep1 = registry.get(Dependency1);
       const dep2 = registry.get(Dependency2);
       return new Service(dep1, dep2);
   });
   ```

2. **Update imports:**
   - Remove `@theia/core/shared/inversify` imports
   - Add `ServiceRegistry` import where needed

3. **Test:**
   ```bash
   cd packages/workspace
   npm test
   ```

## Migration Order

1. **Core package** (must be first)
   ```bash
   npx tsx scripts/migrate-inversify-tsmorph.ts packages/core/src
   ```

2. **Dependent packages** (one at a time)
   ```bash
   # Filesystem
   npx tsx scripts/migrate-inversify-tsmorph.ts packages/filesystem/src
   
   # Workspace
   npx tsx scripts/migrate-inversify-tsmorph.ts packages/workspace/src
   
   # Continue with other packages...
   ```

## What Gets Automated

✅ Removes `@injectable()` decorators  
✅ Converts `@inject()` properties to constructor parameters  
✅ Removes `@postConstruct()` decorators  
✅ Removes inversify imports  
✅ Converts `ContainerModule` to initialization functions  
✅ Converts common bind patterns  

## What Needs Manual Work

⚠️ Completing constructor dependency lists  
⚠️ Handling complex factory patterns  
⚠️ Converting ContributionProvider to ContributionCollection  
⚠️ Updating tests  
⚠️ Removing inversify from package.json  

## Example: Complete Migration of One File

```bash
# 1. Migrate the class
npx tsx scripts/migrate-inversify-tsmorph.ts packages/workspace/src/browser/workspace-service.ts

# 2. Review the changes
git diff packages/workspace/src/browser/workspace-service.ts

# 3. Complete TODO comments manually
# Edit the file to add dependencies

# 4. Test
cd packages/workspace && npm test

# 5. Commit
git add . && git commit -m "Migrate workspace-service from inversify to ES modules"
```

## Troubleshooting

### Script fails with "Cannot find module"
- Ensure you're in the theia root directory
- Check that `tsconfig.json` exists
- Try: `npm install` to ensure dependencies are installed

### Type errors after migration
- Complete all TODO comments
- Ensure ServiceRegistry is imported
- Check that all dependencies are registered

### Circular dependency errors
- Refactor to break cycles
- Use lazy initialization: `() => registry.get(Service)`

## Next Steps

After migrating a package:
1. ✅ Run tests
2. ✅ Fix any type errors
3. ✅ Remove `.inversify-backup` files
4. ✅ Update package.json (remove inversify)
5. ✅ Commit changes
6. ✅ Move to next package

## Getting Help

- See `INVERSIFY_REFACTORING_PLAN.md` for full strategy
- See `INVERSIFY_REFACTORING_EXAMPLES.md` for code examples
- See `scripts/README.md` for detailed script documentation
