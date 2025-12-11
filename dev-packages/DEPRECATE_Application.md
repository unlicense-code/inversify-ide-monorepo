# Deprecation: Application Package & Application Manager

## Overview

The `@theia/application-package` and `@theia/application-manager` packages are **deprecated** and will be removed in a future version. These packages were created in a pre-ESM era when no standard module loader existed, requiring a custom abstraction layer to discover and bundle Theia extensions.

## What's Being Deprecated

### `@theia/application-package`

- **Purpose**: Discovers and analyzes Theia extensions by scanning `package.json` files for `theiaExtensions` metadata
- **Key Features**:
  - Scans dependency tree for packages with `theiaExtensions` property
  - Extracts module paths (frontend, backend, electron-main, etc.)
  - Organizes modules into Maps for bundling
- **Location**: `dev-packages/application-package/`

### `@theia/application-manager`

- **Purpose**: Generates entry files and manages the build process
- **Key Features**:
  - Generates `src-gen/frontend/index.js` and `src-gen/backend/main.js`
  - Creates dynamic import statements for all discovered modules
  - Manages webpack/rollup bundling configuration
- **Location**: `dev-packages/application-manager/`

## Why Deprecate?

1. **Pre-ESM Legacy**: Created before native ESM support was standard
2. **Runtime Discovery**: Requires scanning `package.json` files at build time
3. **Code Generation**: Generates entry files with dynamic imports
4. **Complexity**: Adds abstraction layer that's no longer necessary
5. **Poor Tree-Shaking**: Dynamic imports prevent static analysis
6. **IDE Support**: Generated code lacks proper autocomplete and type checking

## New Approach: ESM Directory Convention

Replace the `theiaExtensions` metadata with a standard directory structure using ESM index files.

### Directory Convention

```bash
packages/
  @theia/{package-name}/
    lib/
      frontend/
        index.js          # Exports all frontend modules
      backend/
        index.js          # Exports all backend modules
      frontend-electron/
        index.js          # Exports electron frontend modules (optional)
      backend-electron/
        index.js          # Exports electron backend modules (optional)
      electron-main/
        index.js          # Exports electron-main modules (optional)
      preload/
        index.js          # Exports preload scripts (optional)
      secondary-window/
        index.js          # Exports secondary window modules (optional)
```

### Example Structure

**Before (Legacy):**

```json
// package.json
{
  "name": "@theia/ai-mcp",
  "theiaExtensions": [{
    "frontend": "lib/browser/mcp-frontend-module",
    "backend": "lib/node/mcp-backend-module"
  }]
}
```

**After (New Convention):**

```bash
@theia/ai-mcp/
  lib/
    frontend/
      index.js          # export { default } from '../browser/mcp-frontend-module.js';
    backend/
      index.js          # export { default } from '../node/mcp-backend-module.js';
```

### Entry Point Generation

**Before (Generated):**

```javascript
// src-gen/frontend/index.js (generated)
await load(container, registry, import('@theia/ai-mcp/lib/browser/mcp-frontend-module.js'));
await load(container, registry, import('@theia/ai-chat/lib/browser/chat-frontend-module.js'));
// ... dynamically discovered
```

**After (Static ESM):**

```javascript
// src-gen/frontend/index.js (static imports)
import '@theia/ai-mcp/lib/frontend/index.js';
import '@theia/ai-chat/lib/frontend/index.js';
import '@theia/core/lib/frontend/index.js';
// ... all imports known at build time
```

## Migration Steps

### Step 1: Create Index Files

For each package, create index files that re-export the modules:

**`packages/ai-mcp/lib/frontend/index.js`:**

```javascript
export { default } from '../browser/mcp-frontend-module.js';
```

**`packages/ai-mcp/lib/backend/index.js`:**

```javascript
export { default } from '../node/mcp-backend-module.js';
```

### Step 2: Update Application Entry Points

Replace dynamic imports with static ESM imports:

```javascript
// src-gen/frontend/index.js
import 'reflect-metadata';
import { Container } from 'inversify';
import { ServiceRegistry } from '@theia/core/lib/common/service-registry.js';

// Static imports - bundler can analyze these
import '@theia/ai-mcp/lib/frontend/index.js';
import '@theia/ai-chat/lib/frontend/index.js';
// ... etc
```

### Step 3: Remove `theiaExtensions` from package.json

```json
{
  "name": "@theia/ai-mcp",
  // Remove this:
  // "theiaExtensions": [...]
}
```

### Step 4: Update Build Process

Replace the discovery and generation process with:
1. Static import scanning (build-time)
2. Direct ESM imports in entry files
3. Standard bundler configuration

## Migration Script

A migration script can automate the creation of index files:

```javascript
// scripts/migrate-to-esm-convention.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

function migratePackage(packagePath) {
  const pkgJsonPath = join(packagePath, 'package.json');
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  
  if (!pkgJson.theiaExtensions) return;
  
  const libPath = join(packagePath, 'lib');
  
  for (const ext of pkgJson.theiaExtensions) {
    // Frontend
    if (ext.frontend) {
      const frontendDir = join(libPath, 'frontend');
      mkdirSync(frontendDir, { recursive: true });
      const indexPath = join(frontendDir, 'index.js');
      const modulePath = ext.frontend.replace(/^lib\//, '');
      writeFileSync(indexPath, `export { default } from '../${modulePath}.js';\n`);
    }
    
    // Backend
    if (ext.backend) {
      const backendDir = join(libPath, 'backend');
      mkdirSync(backendDir, { recursive: true });
      const indexPath = join(backendDir, 'index.js');
      const modulePath = ext.backend.replace(/^lib\//, '');
      writeFileSync(indexPath, `export { default } from '../${modulePath}.js';\n`);
    }
    
    // Frontend Electron
    if (ext.frontendElectron) {
      const dir = join(libPath, 'frontend-electron');
      mkdirSync(dir, { recursive: true });
      const indexPath = join(dir, 'index.js');
      const modulePath = ext.frontendElectron.replace(/^lib\//, '');
      writeFileSync(indexPath, `export { default } from '../${modulePath}.js';\n`);
    }
    
    // Backend Electron
    if (ext.backendElectron) {
      const dir = join(libPath, 'backend-electron');
      mkdirSync(dir, { recursive: true });
      const indexPath = join(dir, 'index.js');
      const modulePath = ext.backendElectron.replace(/^lib\//, '');
      writeFileSync(indexPath, `export { default } from '../${modulePath}.js';\n`);
    }
    
    // Electron Main
    if (ext.electronMain) {
      const dir = join(libPath, 'electron-main');
      mkdirSync(dir, { recursive: true });
      const indexPath = join(dir, 'index.js');
      const modulePath = ext.electronMain.replace(/^lib\//, '');
      writeFileSync(indexPath, `export { default } from '../${modulePath}.js';\n`);
    }
    
    // Preload
    if (ext.preload) {
      const dir = join(libPath, 'preload');
      mkdirSync(dir, { recursive: true });
      const indexPath = join(dir, 'index.js');
      const modulePath = ext.preload.replace(/^lib\//, '');
      writeFileSync(indexPath, `export { default } from '../${modulePath}.js';\n`);
    }
    
    // Secondary Window
    if (ext.secondaryWindow) {
      const dir = join(libPath, 'secondary-window');
      mkdirSync(dir, { recursive: true });
      const indexPath = join(dir, 'index.js');
      const modulePath = ext.secondaryWindow.replace(/^lib\//, '');
      writeFileSync(indexPath, `export { default } from '../${modulePath}.js';\n`);
    }
  }
  
  // Remove theiaExtensions from package.json
  delete pkgJson.theiaExtensions;
  writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
}
```

## Benefits of New Approach

1. ✅ **No Runtime Discovery**: Static ESM imports known at build time
2. ✅ **Better Tree-Shaking**: Bundlers can analyze static imports
3. ✅ **Simpler Build**: No code generation required
4. ✅ **Standard ESM**: Works with native module loaders
5. ✅ **Better IDE Support**: Autocomplete and type checking work
6. ✅ **Easier Debugging**: Clear import paths in stack traces
7. ✅ **Faster Builds**: No dependency scanning overhead

## Timeline

### Phase 1: Preparation (Current)

- [ ] Create this deprecation document
- [ ] Update documentation with new convention
- [ ] Create migration scripts

### Phase 2: Migration (Next Release)

- [ ] Migrate all packages to use directory convention
- [ ] Create index files for all packages
- [ ] Update application entry points to use static imports
- [ ] Remove `theiaExtensions` from all `package.json` files

### Phase 3: Deprecation (Future Release)

- [ ] Mark `@theia/application-package` as deprecated
- [ ] Mark `@theia/application-manager` as deprecated
- [ ] Add deprecation warnings in code
- [ ] Update all examples and templates

### Phase 4: Removal (Future Release)

- [ ] Remove `@theia/application-package` package
- [ ] Remove `@theia/application-manager` package
- [ ] Remove all related code and dependencies

## Breaking Changes

### For Package Authors

1. **Remove `theiaExtensions` from `package.json`**

   ```json
   // Before
   {
     "theiaExtensions": [{ "frontend": "lib/browser/module" }]
   }
   
   // After
   {
     // No theiaExtensions needed
   }
   ```

2. **Create index files in standard locations**
   - `lib/frontend/index.js`
   - `lib/backend/index.js`
   - etc.

### For Application Developers

1. **Entry files use static imports instead of dynamic**

   ```javascript
   // Before (generated)
   await load(container, registry, import('@theia/package/lib/path'));
   
   // After (static)
   import '@theia/package/lib/frontend/index.js';
   ```

2. **Build process simplified**
   - No more `ApplicationPackageManager.generate()`
   - Direct bundler configuration

## Backward Compatibility

During the transition period, both approaches will be supported:

1. **Check for new convention first**: Look for `lib/frontend/index.js`
2. **Fall back to legacy**: Use `theiaExtensions` from `package.json` if index files don't exist
3. **Remove legacy support**: After migration is complete

## Questions?

For questions or concerns about this deprecation, please:
- Open an issue on GitHub
- Check the migration guide
- Review examples in the codebase

## Execution Plan

See [Execution Plan: Unification to Build-Step-Free Codebase](./PLAN_EXECUTION_UNIFICATION.md) for the detailed implementation plan.

## Related Documentation

- [Execution Plan: Unification to Build-Step-Free Codebase](./PLAN_EXECUTION_UNIFICATION.md)
- [ESM Migration Guide](./ESM_MIGRATION.md)
- [Directory Convention Specification](./DIRECTORY_CONVENTION.md)
- [Build Process Documentation](./BUILD_PROCESS.md)
