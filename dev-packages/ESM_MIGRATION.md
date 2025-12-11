# ESM Migration Guide

This guide provides step-by-step instructions for migrating from the legacy `theiaExtensions` metadata approach to the new ESM directory convention.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Migration Steps](#migration-steps)
4. [Package Migration](#package-migration)
5. [Application Migration](#application-migration)
6. [Dynamic Loading via Function Execution](#dynamic-loading-via-function-execution)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

## Overview

The migration involves:
- **Packages**: Creating index files in standard directories following the ESM directory convention
- **Applications**: Updating entry points to use static ESM imports instead of dynamic imports
- **Build Process**: Simplifying the build to use standard bundler configuration without Node.js resolve dependencies

### Core Principle: No Side Effects

**All modules must be pure** - they should have **no side effects** on import. Instead:
- Modules should only export functions, types, or constants
- Initialization code must be wrapped in functions that are explicitly called
- Importing a module should never execute code automatically
- This prevents circular dependencies, enables tree-shaking, and makes code testable

## Prerequisites

- ESM-compatible bundler (Rollup, Webpack, Vite, etc.)
- Understanding of ESM import/export syntax
- Standard directory structure following the convention

## Migration Steps

### Step 1: Identify Packages to Migrate

Find all packages that need index files by checking their directory structure:

```bash
# Find packages that need frontend index files
find packages -path "*/lib/browser/*-module.js" -o -path "*/lib/browser/*-frontend-module.js"

# Find packages that need backend index files
find packages -path "*/lib/node/*-module.js" -o -path "*/lib/node/*-backend-module.js"
```

### Step 2: Create Index Files

For each package, create index files in the appropriate directories following the standard convention.

### Step 3: Update Application Entry Points

Modify application entry points to use static ESM imports pointing to the index files.

### Step 4: Update Build Configuration

Simplify build configuration to use standard bundler setup without Node.js resolve dependencies.

## Package Migration

### Example: Migrating `@theia/ai-mcp`

#### Before (Legacy)

**Structure (no standard entry points):**

```text
@theia/ai-mcp/
  lib/
    browser/
      mcp-frontend-module.js
    node/
      mcp-backend-module.js
```

#### After (New Convention)

**Structure (with standard entry points):**

```text
@theia/ai-mcp/
  lib/
    frontend/
      index.js          # New: exports frontend module
    backend/
      index.js          # New: exports backend module
    browser/
      mcp-frontend-module.js
    node/
      mcp-backend-module.js
```

**`lib/frontend/index.js`:**

```javascript
// Export initialization function (no side effects on import)
export { initialize } from '../browser/mcp-frontend-module.js';
// Or if module exports default ContainerModule, wrap it:
import mcpModule from '../browser/mcp-frontend-module.js';
export function initialize(container, registry) {
  container.load(mcpModule.default);
}
```

**`lib/backend/index.js`:**

```javascript
// Export initialization function (no side effects on import)
export { initialize } from '../node/mcp-backend-module.js';
// Or if module exports default ContainerModule, wrap it:
import mcpModule from '../node/mcp-backend-module.js';
export function initialize(container, registry) {
  container.load(mcpModule.default);
}
```

### Module Types

Different module types require different index files:

#### Frontend Module

```javascript
// lib/frontend/index.js
// Prefer: Export initialization function (no side effects)
import frontendModule from '../browser/your-frontend-module.js';
export function initialize(container, registry) {
  container.load(frontendModule.default);
}

// Alternative: If module already exports initialize function
// export { initialize } from '../browser/your-frontend-module.js';
```

#### Backend Module

```javascript
// lib/backend/index.js
// Prefer: Export initialization function (no side effects)
import backendModule from '../node/your-backend-module.js';
export function initialize(container, registry) {
  container.load(backendModule.default);
}

// Alternative: If module already exports initialize function
// export { initialize } from '../node/your-backend-module.js';
```

#### Frontend Electron Module

```javascript
// lib/frontend-electron/index.js
// Prefer: Export initialization function (no side effects)
import electronModule from '../electron-browser/your-electron-frontend-module.js';
export function initialize(container, registry) {
  container.load(electronModule.default);
}
```

#### Backend Electron Module

```javascript
// lib/backend-electron/index.js
// Prefer: Export initialization function (no side effects)
import electronBackendModule from '../electron-main/your-electron-backend-module.js';
export function initialize(container, registry) {
  container.load(electronBackendModule.default);
}
```

#### Electron Main Module

```javascript
// lib/electron-main/index.js
// Prefer: Export initialization function (no side effects)
import electronMainModule from '../electron-main/your-electron-main-module.js';
export function initialize(container, registry) {
  container.load(electronMainModule.default);
}
```

#### Preload Module

```javascript
// lib/preload/index.js
// Prefer: Export initialization function (no side effects)
import preloadModule from '../preload/your-preload-module.js';
export function initialize(container, registry) {
  container.load(preloadModule.default);
}
```

#### Secondary Window Module

```javascript
// lib/secondary-window/index.js
// Prefer: Export initialization function (no side effects)
import secondaryWindowModule from '../browser/your-secondary-window-module.js';
export function initialize(container, registry) {
  container.load(secondaryWindowModule.default);
}
```

### Multiple Extensions

If a package has multiple extensions, export initialization functions for each:

```javascript
// lib/frontend/index.js
// Export separate initialization functions (no side effects)
import extension1Module from '../browser/extension1-module.js';
import extension2Module from '../browser/extension2-module.js';

export function initializeExtension1(container, registry) {
  container.load(extension1Module.default);
}

export function initializeExtension2(container, registry) {
  container.load(extension2Module.default);
}

// Or export a single function that initializes all:
export function initialize(container, registry) {
  container.load(extension1Module.default);
  container.load(extension2Module.default);
}
```

### Automated Migration Script

Use the migration script to automate index file creation:

```bash
# Run migration script for a single package
node scripts/migrate-to-esm-convention.mjs packages/ai-mcp

# Run for all packages
find packages -type d -name "browser" -o -name "node" | \
  xargs -I {} dirname {} | \
  sort -u | \
  xargs -I {} node scripts/migrate-to-esm-convention.mjs {}
```

## Application Migration

### Application: Before (Legacy)

**Generated `src-gen/frontend/index.js`:**

```javascript
// Auto-generated with dynamic imports
async function preload(container, registry) {
    await load(container, registry, import('@theia/ai-mcp/lib/browser/mcp-frontend-module.js'));
    await load(container, registry, import('@theia/ai-chat/lib/browser/chat-frontend-module.js'));
    // ... more dynamic imports
}
```

### Application: After (New Convention)

**`src-gen/frontend/index.js`:**

```javascript
import 'reflect-metadata';
import { Container } from 'inversify';
import { ServiceRegistry } from '@theia/core/lib/common/service-registry.js';

// Import initialization functions (no side effects on import)
import { initialize as initializeAiMcp } from '@theia/ai-mcp/lib/frontend/index.js';
import { initialize as initializeAiChat } from '@theia/ai-chat/lib/frontend/index.js';
import { initialize as initializeCore } from '@theia/core/lib/frontend/index.js';
// ... import all initialization functions

// Bootstrap code
const container = new Container();
const registry = new ServiceRegistry();

// Explicitly call initialization functions in dependency order
initializeCore(container, registry);
initializeAiMcp(container, registry);
initializeAiChat(container, registry);
// ... call all initialization functions
```

### Generating Entry Points

Instead of using `ApplicationPackageManager.generate()`, create entry points manually or with a simple script:

**`scripts/generate-entry.mjs`:**

```javascript
import { readdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

function discoverFrontendModules() {
  const nodeModules = 'node_modules';
  const theiaPackages = readdirSync(join(nodeModules, '@theia'))
    .filter(name => {
      const indexPath = join(nodeModules, '@theia', name, 'lib', 'frontend', 'index.js');
      return existsSync(indexPath);
    })
    .map(name => `@theia/${name}/lib/frontend/index.js`);
  
  return theiaPackages;
}

function generateFrontendEntry() {
  const modules = discoverFrontendModules();
  const imports = modules
    .map((path, index) => {
      const moduleName = path.split('/').slice(-3, -1).join('_').replace(/-/g, '_');
      return `import { initialize as initialize${moduleName} } from '${path}';`;
    })
    .join('\n');
  
  const initializations = modules
    .map((path, index) => {
      const moduleName = path.split('/').slice(-3, -1).join('_').replace(/-/g, '_');
      return `initialize${moduleName}(container, registry);`;
    })
    .join('\n');
  
  const entry = `import 'reflect-metadata';
import { Container } from 'inversify';
import { ServiceRegistry } from '@theia/core/lib/common/service-registry.js';

${imports}

// Bootstrap code
const container = new Container();
const registry = new ServiceRegistry();

// Explicitly initialize all modules (no side effects on import)
${initializations}

// ... rest of application initialization
`;

  writeFileSync('src-gen/frontend/index.js', entry);
}

generateFrontendEntry();
```

### Backend Entry Point

Similar approach for backend with explicit initialization:

```javascript
// src-gen/backend/main.js
import { initialize as initializeAiMcp } from '@theia/ai-mcp/lib/backend/index.js';
import { initialize as initializeAiChat } from '@theia/ai-chat/lib/backend/index.js';
import { initialize as initializeCore } from '@theia/core/lib/backend/index.js';
// ... import all backend initialization functions

// Explicitly call initialization functions
const container = new Container();
const registry = new ServiceRegistry();

initializeCore(container, registry);
initializeAiMcp(container, registry);
initializeAiChat(container, registry);
// ... call all backend initialization functions
```

## Dynamic Loading via Function Execution

### Dynamic Loading Overview

Instead of creating separate modules for different environments (browser, electron, node), you can use **function-based dynamic loading**. This pattern allows you to:

- Keep environment-specific code in the same module
- Export functions that only execute in their target environment
- Leverage tree-shaking to remove unused code during bundling
- Avoid runtime errors from importing incompatible modules

### How It Works

The pattern works by:
1. Exporting initialization functions for each environment
2. Only calling the function appropriate for the current environment
3. The bundler tree-shakes unused functions and their code
4. Production bundles only contain code for the target environment

### Example: Unified Module with Environment-Specific Functions

**`lib/frontend/index.js`:**

```javascript
// Export functions for different environments
// Only the appropriate function will be called at runtime

/**
 * Initialize for browser environment
 * @param {Container} container - Inversify container
 * @param {ServiceRegistry} registry - Service registry
 */
export function initializeBrowser(container, registry) {
  // Browser-specific code - import only when function is called
  // Use dynamic import to avoid side effects on module load
  return import('../browser/browser-module.js').then(module => {
    container.load(module.default);
  });
}

/**
 * Initialize for Electron environment
 * @param {Container} container - Inversify container
 * @param {ServiceRegistry} registry - Service registry
 */
export function initializeElectron(container, registry) {
  // Electron-specific code - import only when function is called
  return import('../electron-browser/electron-module.js').then(module => {
    container.load(module.default);
  });
}

/**
 * Initialize for browser-only environment (no backend)
 * @param {Container} container - Inversify container
 * @param {ServiceRegistry} registry - Service registry
 */
export function initializeBrowserOnly(container, registry) {
  // Browser-only specific code - import only when function is called
  return import('../browser-only/browser-only-module.js').then(module => {
    container.load(module.default);
  });
}
```

### Usage in Application Entry Point

**`src-gen/frontend/index.js`:**

```javascript
import 'reflect-metadata';
import { Container } from 'inversify';
import { ServiceRegistry } from '@theia/core/lib/common/service-registry.js';

// Import the initialization functions
import { 
  initializeBrowser, 
  initializeElectron, 
  initializeBrowserOnly 
} from '@theia/your-package/lib/frontend/index.js';

// Import other packages
import '@theia/core/lib/frontend/index.js';
// ... other imports

// Bootstrap
const container = new Container();
const registry = new ServiceRegistry();

// Determine environment and call appropriate function
if (typeof window !== 'undefined' && window.electron) {
  // Electron environment
  initializeElectron(container, registry);
} else if (typeof window !== 'undefined' && !window.backend) {
  // Browser-only environment (no backend)
  initializeBrowserOnly(container, registry);
} else {
  // Standard browser environment
  initializeBrowser(container, registry);
}

// Continue with application startup
```

### Tree-Shaking Benefits

When bundling for a specific environment, the bundler will:

1. **Analyze the call graph**: Only `initializeBrowser` is called in browser builds
2. **Remove unused code**: `initializeElectron` and `initializeBrowserOnly` are never called
3. **Eliminate dependencies**: Electron-specific imports are removed from the bundle
4. **Reduce bundle size**: Only code for the target environment is included

**Example build output:**

```javascript
// Browser bundle (production)
// initializeElectron and initializeBrowserOnly are completely removed
import { initializeBrowser } from '@theia/your-package/lib/frontend/index.js';
// ... only browser code remains
```

### Advanced Pattern: Multiple Initialization Functions

You can export multiple initialization functions from the same index file, allowing the bundler to tree-shake unused code:

**`lib/frontend/index.js`:**

```javascript
// Main entry point that exports all functions
export { initializeBrowser } from './browser-init.js';
export { initializeElectron } from './electron-init.js';
export { initializeBrowserOnly } from './browser-only-init.js';
```

### Pattern: Environment Detection

Create a utility to detect the environment:

**`lib/common/environment.js`:**

```javascript
/**
 * Detect the current runtime environment
 */
export function getEnvironment() {
  if (typeof window !== 'undefined') {
    if (window.electron) {
      return 'electron';
    }
    if (!window.backend) {
      return 'browser-only';
    }
    return 'browser';
  }
  if (typeof process !== 'undefined' && process.versions?.electron) {
    return 'electron-main';
  }
  return 'node';
}
```

**Usage:**

```javascript
import { getEnvironment } from '@theia/your-package/lib/common/environment.js';
import { 
  initializeBrowser, 
  initializeElectron, 
  initializeBrowserOnly 
} from '@theia/your-package/lib/frontend/index.js';

const env = getEnvironment();
const container = new Container();
const registry = new ServiceRegistry();

switch (env) {
  case 'electron':
    initializeElectron(container, registry);
    break;
  case 'browser-only':
    initializeBrowserOnly(container, registry);
    break;
  case 'browser':
  default:
    initializeBrowser(container, registry);
    break;
}
```

### Pattern: Single Function with Environment Parameter

Alternatively, use a single function that takes the environment as a parameter:

**`lib/frontend/index.js`:**

```javascript
/**
 * Initialize the module for the given environment
 * @param {Container} container - Inversify container
 * @param {ServiceRegistry} registry - Service registry
 * @param {string} environment - Environment: 'browser', 'electron', 'browser-only'
 */
export async function initialize(container, registry, environment = 'browser') {
  // Import modules only when function is called (no side effects on import)
  switch (environment) {
    case 'electron':
      // Electron-specific initialization
      const electronModule = await import('../electron-browser/electron-module.js');
      container.load(electronModule.default);
      break;
    case 'browser-only':
      // Browser-only initialization
      const browserOnlyModule = await import('../browser-only/browser-only-module.js');
      container.load(browserOnlyModule.default);
      break;
    case 'browser':
    default:
      // Standard browser initialization
      const browserModule = await import('../browser/browser-module.js');
      container.load(browserModule.default);
      break;
  }
}
```

**Usage:**

```javascript
import { initialize } from '@theia/your-package/lib/frontend/index.js';
import { getEnvironment } from '@theia/your-package/lib/common/environment.js';

const container = new Container();
const registry = new ServiceRegistry();
const env = getEnvironment();

initialize(container, registry, env);
```

### Benefits

1. **Single Module**: All environment code in one place
2. **Tree-Shaking**: Unused code removed automatically
3. **Type Safety**: TypeScript can check all code paths
4. **No Runtime Errors**: Only appropriate code executes
5. **Smaller Bundles**: Only target environment code included
6. **Easier Maintenance**: Related code stays together

### Best Practices

1. **Use Named Exports**: Export functions with clear names
2. **Document Functions**: Add JSDoc comments explaining each function
3. **Environment Detection**: Use a utility function for environment detection
4. **Type Safety**: Use TypeScript for better type checking
5. **Test All Paths**: Ensure all environment paths are tested
6. **Bundle Analysis**: Verify tree-shaking is working correctly

### Example: Complete Package Structure

```text
@theia/your-package/
  lib/
    frontend/
      index.js              # Exports initializeBrowser, initializeElectron, etc.
      browser-init.js       # Browser-specific initialization
      electron-init.js      # Electron-specific initialization
      browser-only-init.js  # Browser-only initialization
    common/
      environment.js        # Environment detection utility
    browser/
      browser-module.js     # Browser module code
    electron-browser/
      electron-module.js    # Electron module code
    browser-only/
      browser-only-module.js # Browser-only module code
```

### Verifying Tree-Shaking

To verify tree-shaking is working:

1. **Build for browser**:

   ```bash
   npm run build:browser
   ```

2. **Check bundle size**: Should not include Electron code

3. **Search bundle for Electron code**:

   ```bash
   grep -i "electron" lib/frontend/bundle.js
   # Should return no results (or only in comments)
   ```

4. **Build for Electron**:

   ```bash
   npm run build:electron
   ```

5. **Verify Electron code is included**: Electron bundle should include Electron-specific code

## Verification

### Check Index Files Exist

```bash
# Verify frontend index files
find packages -path "*/lib/frontend/index.js" | wc -l

# Verify backend index files
find packages -path "*/lib/backend/index.js" | wc -l
```

### Check Index Files Created

```bash
# Verify all required index files exist
find packages -path "*/lib/frontend/index.js" | wc -l
find packages -path "*/lib/backend/index.js" | wc -l
```

### Test Build

```bash
# Build the application
npm run build

# Check for import errors
npm run build 2>&1 | grep -i "cannot find module"
```

### Runtime Verification

1. Start the application
2. Check browser console for import errors
3. Verify all extensions load correctly
4. Test extension functionality

## Troubleshooting

### Issue: Module Not Found

**Error:**

```text
Error: Cannot find module '@theia/package/lib/frontend/index.js'
```

**Solution:**
1. Verify the index file exists: `packages/package/lib/frontend/index.js`
2. Check the export path in the index file is correct
3. Ensure the package is in `node_modules`

### Issue: Circular Dependencies

**Error:**

```text
Circular dependency detected
```

#### Solution: Use Wrapper Functions with No Side Effects

Modules should have no side effects on import. Instead, export wrapper functions that are called independently:

**Bad Example (Side Effects on Import):**

```javascript
// module-a.js
import { ServiceB } from './module-b.js';

// Side effect: executes on import
const serviceA = new ServiceA();
serviceA.initialize(ServiceB);
export default serviceA;
```

**Good Example (No Side Effects, Wrapper Function):**

```javascript
// module-a.js
import { createServiceB } from './module-b.js';

// No side effects - just exports a function
export function initializeModuleA(container, registry) {
  const serviceB = createServiceB(container, registry);
  const serviceA = new ServiceA();
  serviceA.initialize(serviceB);
  container.bind(ServiceA).toConstantValue(serviceA);
}
```

#### Pattern: Independent Initialization Functions

Each module exports an initialization function that takes dependencies as parameters:

```javascript
// module-a.js
export function initializeModuleA(container, registry, dependencies = {}) {
  // Use dependencies passed in, not imported directly
  const serviceB = dependencies.serviceB || container.get(ServiceB);
  const serviceA = new ServiceA();
  serviceA.initialize(serviceB);
  container.bind(ServiceA).toConstantValue(serviceA);
}
```

```javascript
// module-b.js
export function initializeModuleB(container, registry, dependencies = {}) {
  const serviceB = new ServiceB();
  container.bind(ServiceB).toConstantValue(serviceB);
  return serviceB; // Return for use by other modules
}
```

**Usage in Entry Point:**

```javascript
// Entry point calls functions in correct order
import { initializeModuleB } from './module-b.js';
import { initializeModuleA } from './module-a.js';

const container = new Container();
const registry = new ServiceRegistry();

// Initialize in dependency order
const serviceB = initializeModuleB(container, registry);
initializeModuleA(container, registry, { serviceB });
```

**Benefits:**
1. **No Circular Dependencies**: Modules don't import each other directly
2. **No Side Effects**: Importing a module doesn't execute code
3. **Explicit Dependencies**: Dependencies are passed as parameters
4. **Tree-Shakeable**: Unused modules are removed by bundler
5. **Testable**: Easy to test with mock dependencies

### Issue: Type Errors

**Error:**

```text
Type error: Module has no exported member
```

**Solution:**
1. Verify the module exports `default`
2. Check TypeScript definitions are up to date
3. Ensure `export { default }` syntax is correct

### Issue: Build Fails

**Error:**

```text
Build failed: Cannot resolve module
```

**Solution:**
1. Check bundler configuration
2. Verify all dependencies are installed
3. Check for missing index files
4. Review bundler external configuration

### Issue: Runtime Errors

**Error:**

```text
Module not initialized
```

**Solution:**
1. Verify modules export initialization functions (no side effects on import)
2. Check that all initialization functions are explicitly called
3. Ensure modules are initialized in correct dependency order
4. Verify modules have no side effects - they should only export functions

## Migration Checklist

### For Each Package

- [ ] Create `lib/frontend/index.ts` (if has frontend module) - **Use `.ts` for modern builds**
- [ ] Create `lib/backend/index.ts` (if has backend module) - **Use `.ts` for modern builds**
- [ ] Create `lib/frontend-electron/index.ts` (if has electron frontend)
- [ ] Create `lib/backend-electron/index.ts` (if has electron backend)
- [ ] Create `lib/electron-main/index.ts` (if has electron main)
- [ ] Create `lib/preload/index.ts` (if has preload)
- [ ] Create `lib/secondary-window/index.ts` (if has secondary window)
- [ ] Export `initialize()` function (no side effects on import)
- [ ] Verify index files are pure modules
- [ ] Test package works with direct `.ts` execution
- [ ] Verify static imports work as expected

### For Applications

- [ ] Update `src-gen/frontend/index.ts` to use static imports from `.ts` files
- [ ] Update `src-gen/backend/main.ts` to use static imports from `.ts` files
- [ ] Configure Service Worker for frontend `.ts` loading
- [ ] Configure Node.js `--experimental-strip-types` for backend
- [ ] Remove dependency on `@theia/application-package`
- [ ] Remove dependency on `@theia/application-manager`
- [ ] Test frontend with Service Worker (no build step)
- [ ] Test backend with direct `.ts` execution (no build step)
- [ ] Verify all extensions load correctly

## Migration Best Practices

1. **No Side Effects**: Modules must have no side effects on import - only export functions
2. **Explicit Initialization**: Always use initialization functions that are explicitly called
3. **Pure Modules**: Import statements should only import functions/types, never execute code
4. **Consistent Naming**: Use consistent naming for initialization functions (e.g., `initialize`)
5. **Clear Paths**: Use relative paths that are easy to understand
6. **Documentation**: Document initialization functions and their dependencies
7. **Testing**: Test each package after migration, verify no side effects on import
8. **Incremental**: Migrate packages incrementally, not all at once

## Execution Plan

This migration is part of the larger unification effort. See [Execution Plan: Unification to Build-Step-Free Codebase](./PLAN_EXECUTION_UNIFICATION.md) for the complete implementation strategy.

## Related Documentation

- [Execution Plan: Unification to Build-Step-Free Codebase](./PLAN_EXECUTION_UNIFICATION.md)
- [Directory Convention Specification](./DIRECTORY_CONVENTION.md)
- [Build Process Documentation](./BUILD_PROCESS.md)
- [Deprecation Notice](./DEPRECATE_Application.md)
