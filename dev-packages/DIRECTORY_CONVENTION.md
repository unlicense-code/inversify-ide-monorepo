# Directory Convention Specification

This document specifies the standard directory structure for Theia packages using ESM (ECMAScript Modules).

## Overview

Theia packages follow a standard directory convention where entry points are located in predictable directories with `index.ts` files. This replaces the legacy `theiaExtensions` metadata approach and enables static analysis, better tree-shaking, improved IDE support, and **build-step-free execution**.

**Key Points**:
- Entry points use `index.ts` (not `index.js`) for modern builds
- Frontend: Service Worker loads `.ts` files directly, strips types with Babel, caches results
- Backend: Node.js 22+ runs `.ts` files directly with `--experimental-strip-types`
- No compilation step required - direct TypeScript execution

## Standard Structure

```bash
packages/
  @theia/{package-name}/
    lib/
      frontend/
        index.ts          # Frontend entry point (TypeScript for modern builds)
      backend/
        index.ts          # Backend entry point (TypeScript for modern builds)
      frontend-electron/
        index.ts          # Electron frontend entry point (optional)
      backend-electron/
        index.ts          # Electron backend entry point (optional)
      electron-main/
        index.ts          # Electron main process entry point (optional)
      preload/
        index.ts          # Preload scripts entry point (optional)
      secondary-window/
        index.ts          # Secondary window entry point (optional)
      {other}/
        ...               # Package-specific directories
```

**Note**: All index files are `.ts` (TypeScript) to support build-step-free execution:
- **Frontend**: Service Worker intercepts `.ts` requests, Babel strips types, results cached
- **Backend**: Node.js 22+ runs `.ts` files directly with `--experimental-strip-types`

## Directory Descriptions

### `lib/frontend/`

**Purpose**: Browser frontend modules that run in the browser environment.

**When to use**:
- Modules that provide UI components
- Browser-only services
- Frontend application contributions

**Index file location**: `lib/frontend/index.ts`

**Example:**

```typescript
// lib/frontend/index.ts
// Pure module - no side effects on import
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Explicit initialization logic
  // ...
}

// Re-export module if needed
export { default } from '../browser/mcp-frontend-module.js';
```

**Import path**: `@theia/{package-name}/lib/frontend/index.ts`

**Note**: Use `.ts` extension for modern builds. Service Worker will handle type stripping and caching.

### `lib/backend/`

**Purpose**: Node.js backend modules that run on the server.

**When to use**:
- Server-side services
- Backend application contributions
- Node.js-specific functionality

**Index file location**: `lib/backend/index.ts`

**Example:**

```typescript
// lib/backend/index.ts
// Pure module - no side effects on import
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Explicit initialization logic
  // ...
}

// Re-export module if needed
export { default } from '../node/mcp-backend-module.js';
```

**Import path**: `@theia/{package-name}/lib/backend/index.ts`

**Note**: Use `.ts` extension for modern builds. Node.js 22+ with `--experimental-strip-types` runs these directly.

### `lib/frontend-electron/`

**Purpose**: Electron-specific frontend modules (overrides `frontend` in Electron).

**When to use**:
- Electron-specific UI components
- Electron frontend services that differ from browser

**Index file location**: `lib/frontend-electron/index.ts`

**Example:**

```typescript
// lib/frontend-electron/index.ts
// Pure module - no side effects on import
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Explicit initialization logic
  // ...
}

// Re-export module if needed
export { default } from '../electron-browser/electron-frontend-module.js';
```

**Import path**: `@theia/{package-name}/lib/frontend-electron/index.ts`

**Note**: If not provided, `lib/frontend/index.ts` is used in Electron.

### `lib/backend-electron/`

**Purpose**: Electron-specific backend modules (overrides `backend` in Electron).

**When to use**:
- Electron-specific backend services
- Electron main process services

**Index file location**: `lib/backend-electron/index.ts`

**Example:**

```typescript
// lib/backend-electron/index.ts
// Pure module - no side effects on import
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Explicit initialization logic
  // ...
}

// Re-export module if needed
export { default } from '../electron-main/electron-backend-module.js';
```

**Import path**: `@theia/{package-name}/lib/backend-electron/index.ts`

**Note**: If not provided, `lib/backend/index.ts` is used in Electron.

### `lib/electron-main/`

**Purpose**: Electron main process modules.

**When to use**:
- Electron main process initialization
- Electron-specific main process services

**Index file location**: `lib/electron-main/index.ts`

**Example:**

```typescript
// lib/electron-main/index.ts
// Pure module - no side effects on import
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Explicit initialization logic
  // ...
}

// Re-export module if needed
export { default } from '../electron-main/electron-main-module.js';
```

**Import path**: `@theia/{package-name}/lib/electron-main/index.ts`

### `lib/preload/`

**Purpose**: Electron preload scripts.

**When to use**:
- Electron preload scripts that run before page load
- Security-sensitive code that needs to run in isolated context

**Index file location**: `lib/preload/index.ts`

**Example:**

```typescript
// lib/preload/index.ts
// Pure module - no side effects on import
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Explicit initialization logic
  // ...
}

// Re-export module if needed
export { default } from '../preload/preload-script.js';
```

**Import path**: `@theia/{package-name}/lib/preload/index.ts`

### `lib/secondary-window/`

**Purpose**: Secondary window modules.

**When to use**:
- Modules that run in secondary windows
- Extracted widget modules

**Index file location**: `lib/secondary-window/index.ts`

**Example:**

```typescript
// lib/secondary-window/index.ts
// Pure module - no side effects on import
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Explicit initialization logic
  // ...
}

// Re-export module if needed
export { default } from '../browser/secondary-window-module.js';
```

**Import path**: `@theia/{package-name}/lib/secondary-window/index.ts`

## Index File Format

### Pure Module Pattern (Required)

**All index files must be pure modules with no side effects on import.** This enables:
- Build-step-free execution
- Better tree-shaking
- Prevention of circular dependencies
- Improved testability

### Standard Pattern with Initialization Function

Each index file should export an initialization function:

```typescript
// lib/frontend/index.ts
import type { Container } from 'inversify';
import type { ServiceRegistry } from '@theia/core/lib/common/service-registry.js';

// Pure module - no side effects on import
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Explicit initialization logic
  // Register services, bind dependencies, etc.
  // This function is called explicitly by the application entry point
}

// Re-export types and utilities if needed
export { default } from '../browser/your-module.js';
export type { SomeType } from '../browser/your-module.js';
```

### Multiple Modules

If a package has multiple modules, export initialization functions for each:

```typescript
// lib/frontend/index.ts
export function initializeModule1(container: Container, registry: ServiceRegistry): void {
  // Initialize module 1
}

export function initializeModule2(container: Container, registry: ServiceRegistry): void {
  // Initialize module 2
}

// Re-export modules
export { default as module1 } from '../browser/module1.js';
export { default as module2 } from '../browser/module2.js';
```

### Re-exporting Named Exports

If you need to re-export named exports:

```typescript
// lib/frontend/index.ts
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Initialization logic
}

export { default } from '../browser/your-module.js';
export { SomeService, AnotherService } from '../browser/your-module.js';
export type { SomeType, AnotherType } from '../browser/your-module.js';
```

### Important: No Side Effects

**Never execute code on import** - all initialization must be explicit:

```typescript
// ❌ WRONG - Side effects on import
// lib/frontend/index.ts
import '../browser/your-module.js'; // This executes code!
export { default } from '../browser/your-module.js';

// ✅ CORRECT - Pure module with explicit initialization
// lib/frontend/index.ts
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Explicit initialization - called by application entry point
  // ...
}
export { default } from '../browser/your-module.js';
```

## Module Resolution

### Import Paths

Applications import modules using the standard import path with `.ts` extension:

```typescript
// In application entry point (src-gen/frontend/index.ts)
import { initialize as initializeAiMcp } from '@theia/ai-mcp/lib/frontend/index.ts';
import { initialize as initializeAiChat } from '@theia/ai-chat/lib/backend/index.ts';

// Bootstrap
const container = new Container();
const registry = new ServiceRegistry();

// Explicit initialization (no side effects on import)
initializeAiMcp(container, registry);
initializeAiChat(container, registry);
```

### Path Resolution

1. **Package name**: `@theia/{package-name}`
2. **Directory**: `lib/{module-type}/`
3. **File**: `index.ts` (TypeScript for modern builds)

**Note**:
- Frontend: Service Worker intercepts `.ts` requests, strips types with Babel, caches results
- Backend: Node.js 22+ runs `.ts` files directly with `--experimental-strip-types`

### Bundler Configuration

Bundlers should resolve these paths from `node_modules`:

```javascript
// rollup.config.js
export default {
  external: (id) => {
    // Don't bundle @theia packages, they're external
    if (id.startsWith('@theia/')) {
      return true;
    }
    return false;
  }
};
```

## Package.json

### No `theiaExtensions` Required

Packages should **not** include `theiaExtensions` in `package.json`:

```json
{
  "name": "@theia/ai-mcp",
  "type": "module",
  "main": "lib/common/index.js",
  "exports": {
    ".": "./lib/common/index.js",
    "./lib/frontend": "./lib/frontend/index.js",
    "./lib/backend": "./lib/backend/index.js"
  }
}
```

### Optional: Package Exports

You can optionally define package exports for better tooling support:

```json
{
  "exports": {
    ".": "./lib/common/index.js",
    "./lib/frontend": "./lib/frontend/index.js",
    "./lib/backend": "./lib/backend/index.js",
    "./lib/frontend-electron": "./lib/frontend-electron/index.js",
    "./lib/backend-electron": "./lib/backend-electron/index.js"
  }
}
```

## Module Types Mapping

### Legacy to New Convention

| Legacy `theiaExtensions` | New Directory | Index File |
|-------------------------|---------------|------------|
| `frontend` | `lib/frontend/` | `lib/frontend/index.ts` |
| `backend` | `lib/backend/` | `lib/backend/index.ts` |
| `frontendElectron` | `lib/frontend-electron/` | `lib/frontend-electron/index.ts` |
| `backendElectron` | `lib/backend-electron/` | `lib/backend-electron/index.ts` |
| `electronMain` | `lib/electron-main/` | `lib/electron-main/index.ts` |
| `preload` | `lib/preload/` | `lib/preload/index.ts` |
| `secondaryWindow` | `lib/secondary-window/` | `lib/secondary-window/index.ts` |
| `frontendPreload` | `lib/frontend/` (with preload) | `lib/frontend/index.ts` |
| `frontendOnly` | `lib/frontend/` | `lib/frontend/index.ts` |

**Note**: All index files use `.ts` extension for build-step-free execution.

## Examples

### Simple Package (Frontend Only)

```bash
@theia/ai-editor/
  lib/
    frontend/
      index.ts          # Pure module with initialize() function
    browser/
      ai-editor-frontend-module.ts
```

**Example `index.ts`**:

```typescript
// lib/frontend/index.ts
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Initialization logic
}
export { default } from '../browser/ai-editor-frontend-module.js';
```

### Full Package (Frontend + Backend)

```bash
@theia/ai-mcp/
  lib/
    frontend/
      index.ts          # Pure module with initialize() function
    backend/
      index.ts          # Pure module with initialize() function
    browser/
      mcp-frontend-module.ts
    node/
      mcp-backend-module.ts
```

**Example `index.ts` files**:

```typescript
// lib/frontend/index.ts
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Frontend initialization
}
export { default } from '../browser/mcp-frontend-module.js';

// lib/backend/index.ts
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Backend initialization
}
export { default } from '../node/mcp-backend-module.js';
```

### Electron Package

```bash
@theia/electron-extension/
  lib/
    frontend/
      index.ts          # Browser frontend
    frontend-electron/
      index.ts          # Electron frontend (overrides frontend in Electron)
    backend/
      index.ts          # Node.js backend
    backend-electron/
      index.ts          # Electron backend (overrides backend in Electron)
    electron-main/
      index.ts          # Electron main process
    preload/
      index.ts          # Preload scripts
```

**Note**: All index files are `.ts` for build-step-free execution.

## Validation

### Check Structure

```bash
# Verify index.ts files exist
find packages -name "index.ts" -path "*/lib/frontend/*" | sort
find packages -name "index.ts" -path "*/lib/backend/*" | sort

# Verify initialization functions exist
grep -r "export function initialize" packages/*/lib/frontend/index.ts
grep -r "export function initialize" packages/*/lib/backend/index.ts
```

### Verify Exports

```typescript
// Test import (no side effects)
import { initialize } from '@theia/package/lib/frontend/index.ts';
console.assert(typeof initialize === 'function', 'Module should export initialize function');

// Test initialization (explicit call)
const container = new Container();
const registry = new ServiceRegistry();
initialize(container, registry); // Explicit initialization
```

## Best Practices

1. **Use `.ts` Extension**: All index files must be `.ts` (not `.js`) for build-step-free execution
2. **Pure Modules**: No side effects on import - only export functions/types
3. **Explicit Initialization**: Export `initialize()` function that is explicitly called
4. **Consistent Structure**: Always use the same directory structure
5. **Clear Paths**: Use relative paths that are easy to understand
6. **Documentation**: Document initialization functions and their dependencies
7. **Testing**: Test imports work correctly (no side effects)
8. **Type Safety**: Ensure TypeScript definitions are correct

## Migration from Legacy

See [ESM Migration Guide](./ESM_MIGRATION.md) for step-by-step migration instructions.

## Execution Plan

This directory convention is being implemented as part of the unification to a build-step-free codebase. See [Execution Plan: Unification to Build-Step-Free Codebase](./PLAN_EXECUTION_UNIFICATION.md) for the complete implementation strategy.

## Related Documentation

- [Execution Plan: Unification to Build-Step-Free Codebase](./PLAN_EXECUTION_UNIFICATION.md)
- [ESM Migration Guide](./ESM_MIGRATION.md)
- [Build Process Documentation](./BUILD_PROCESS.md)
- [Deprecation Notice](./DEPRECATE_Application.md)
