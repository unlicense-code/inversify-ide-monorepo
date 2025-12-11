# Bootstrap Migration - Hybrid Approach

## Overview

The bootstrap code in `dev-packages/application-manager/src/generator/frontend-generator.ts` has been updated to support both:
1. **Old format**: ContainerModule (via `container.load()`)
2. **New format**: Initialization functions (via `registry.registerSingleton()`)

This allows gradual migration - modules can be migrated one at a time without breaking the entire application.

## How It Works

### Module Loading Logic

The `load()` function checks modules in this order:

1. **Initialization Functions**: Looks for exported functions starting with "initialize" that take one parameter (the ServiceRegistry)
   - Example: `export function initializeAnthropicFrontendModule(registry: ServiceRegistry)`
   - These are called directly with the registry

2. **ContainerModule (fallback)**: If no initialization function is found, checks for `module.default`
   - If it's a function, tries `container.load(module.default)` (old Inversify format)
   - If that fails and the function takes one parameter, tries calling it as an initialization function

### Dual Registry Support

The bootstrap creates both:
- `container`: Inversify Container (for old modules)
- `registry`: ServiceRegistry (for new modules)

Both are stored in `window.theia` for compatibility:
```javascript
window.theia.container = container;
window.theia.registry = registry;
```

### Service Resolution

When getting services, the code tries registry first, then falls back to container:
```javascript
let app;
try {
    app = registry.get(FrontendApplication);
} catch {
    app = container.get(FrontendApplication);
}
```

## Migration Strategy

### Step 1: Migrate Module
Convert a module from ContainerModule to initialization function:
```typescript
// Before
export default new ContainerModule(bind => {
    bind(Service).toSelf().inSingletonScope();
});

// After
export function initializeModule(registry: ServiceRegistry): void {
    registry.registerSingleton(Service, () => new Service());
}
```

### Step 2: Rebuild
Run the build process - the generator will automatically detect and use the new format.

### Step 3: Test
The module should work seamlessly alongside unmigrated modules.

## Current Status

- ✅ Bootstrap code updated to support hybrid approach
- ✅ ServiceRegistry created and exported
- ✅ ai-anthropic package migrated (proof of concept)
- ⏳ Core modules still use ContainerModule (can be migrated incrementally)

## Next Steps

1. Migrate core modules one by one:
   - `frontend-application-module.ts`
   - `messaging-frontend-module.ts`
   - `logger-frontend-module.ts`
   - etc.

2. Eventually remove Container support once all modules are migrated

3. Update backend generator similarly

## Benefits

- **Gradual Migration**: No big-bang refactoring
- **Backward Compatible**: Old modules continue to work
- **Testable**: Can test migrated modules in isolation
- **Low Risk**: Easy to rollback if issues arise
