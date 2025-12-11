# Inversify Migration Progress

## Status: In Progress

## Completed

### Core Infrastructure ✅
- [x] Created `ServiceRegistry` class (`packages/core/src/common/service-registry.ts`)
- [x] Created `ContributionCollection` class (`packages/core/src/common/contribution-collection.ts`)
- [x] Exported from `packages/core/src/common/index.ts`

### Package Migrations

#### ai-anthropic Package ✅ (Partial)
- [x] Migrated `AnthropicFrontendApplicationContribution` class
  - Removed `@injectable()` decorator
  - Removed `@inject()` decorators
  - Converted to constructor injection
- [x] Migrated `anthropic-frontend-module.ts`
  - Converted `ContainerModule` to `initializeAnthropicFrontendModule()` function
  - Converted all bind patterns:
    - `toConstantValue()` → `registry.registerSingleton()`
    - `toSelf().inSingletonScope()` → `registry.registerSingleton()` with factory
    - `toService()` → `registry.registerSingleton()` with alias
    - `toDynamicValue()` → `registry.registerSingleton()` with factory function
- [x] Migrated `AnthropicLanguageModelsManagerImpl` class
  - Removed `@injectable()` decorator
  - Removed `@inject()` decorators
  - Converted to constructor injection

## In Progress

### Bootstrap Migration ✅
- [x] Updated `frontend-generator.ts` to support hybrid loading
  - Supports both ContainerModule (old) and initialization functions (new)
  - Creates both Container and ServiceRegistry
  - Automatically detects and uses correct format
  - See `BOOTSTRAP_MIGRATION.md` for details

### ai-anthropic Package
- [ ] Migrate `anthropic-backend-module.ts`
  - **Issue**: Uses `ConnectionContainerModule.create()` pattern
  - **Status**: Needs investigation - this is a special RPC connection pattern

## Discovered Patterns & Issues

### 1. ConnectionContainerModule Pattern
**Location**: `packages/core/src/node/messaging/connection-container-module.ts`

**Current Implementation**: Uses Inversify `ContainerModule` for per-connection scoped services

**Challenge**: This pattern creates a new container per connection, which is more complex than simple singletons.

**Possible Solutions**:
1. Create a `ConnectionServiceRegistry` that mimics the per-connection behavior
2. Refactor to use a factory pattern that creates services per connection
3. Keep ConnectionContainerModule temporarily and migrate it later

**Status**: Needs design decision

### 2. Application Bootstrap
**Issue**: Need to find where modules are loaded and update to use `ServiceRegistry`

**Next Steps**:
- Find application entry points
- Update module loading mechanism
- Replace `Container.load()` with initialization function calls

### 3. ContributionProvider Pattern
**Current**: Uses Inversify's `ContributionProvider` with named bindings

**Solution**: Already created `ContributionCollection` but need to:
- Update code that uses `ContributionProvider`
- Replace `bindContributionProvider()` calls
- Update code that injects `ContributionProvider`

## Migration Statistics

- **Files Migrated**: 3
- **Classes Migrated**: 2
- **Modules Migrated**: 1
- **Packages Started**: 1 (ai-anthropic)

## Next Steps

1. **Investigate ConnectionContainerModule**
   - Understand how it's used in the application
   - Design replacement pattern
   - Document approach

2. **Find Application Bootstrap**
   - Locate where modules are loaded
   - Update to use ServiceRegistry
   - Test with ai-anthropic package

3. **Complete ai-anthropic Backend**
   - Migrate backend module (handle ConnectionContainerModule)
   - Test end-to-end

4. **Update Tests**
   - Migrate test files to use ServiceRegistry
   - Ensure all tests pass

5. **Document Patterns**
   - Document ConnectionContainerModule replacement
   - Document ContributionProvider migration
   - Create migration guide for other packages

## Lessons Learned

1. **Simple packages are easier**: ai-anthropic was a good starting point
2. **Dynamic values work well**: `toDynamicValue()` converts cleanly to factory functions
3. **Service aliases are straightforward**: `toService()` → `registry.get()` alias
4. **ConnectionContainerModule is complex**: Needs special handling
5. **Constructor injection is cleaner**: Makes dependencies explicit

## Files Changed

### Core Package
- `packages/core/src/common/service-registry.ts` (new)
- `packages/core/src/common/contribution-collection.ts` (new)
- `packages/core/src/common/index.ts` (updated exports)

### ai-anthropic Package
- `packages/ai-anthropic/src/browser/anthropic-frontend-application-contribution.ts` (migrated)
- `packages/ai-anthropic/src/browser/anthropic-frontend-module.ts` (migrated)
- `packages/ai-anthropic/src/node/anthropic-language-models-manager-impl.ts` (migrated)

## Questions & Decisions Needed

1. **ConnectionContainerModule**: How should we handle per-connection scoped services?
2. **Application Bootstrap**: Where is the main application container/module loading?
3. **ContributionProvider Migration**: Should we migrate all at once or incrementally?
4. **Testing Strategy**: How to test ServiceRegistry-based code?
