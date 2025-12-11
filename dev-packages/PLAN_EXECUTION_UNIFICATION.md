# Execution Plan: Unification to Build-Step-Free Codebase

This document outlines the execution plan for migrating Theia to a build-step-free codebase using the ESM directory convention with `index.ts` entrypoints.

## Overview

The goal is to unify Theia's build process by:
1. Implementing the [Directory Convention](./DIRECTORY_CONVENTION.md) with `index.ts` entrypoints
2. Migrating from legacy `theiaExtensions` metadata to standard directory structure
3. Enabling build-step-free execution for both frontend and backend
4. Supporting direct `.ts` file loading via Service Worker (frontend) and Node.js `--experimental-strip-types` (backend)

## Execution Phases

### Phase 1: Foundation - Directory Convention Implementation

**Goal**: Create `index.ts` entrypoints in all packages following the directory convention.

#### Step 1.1: Audit Current Structure

```bash
# Find all packages that need index files
find packages -type d -name "browser" -o -name "node" -o -name "electron-main" | sort

# Identify packages with theiaExtensions
grep -r "theiaExtensions" packages/*/package.json | cut -d: -f1
```

**Deliverables**:
- List of all packages requiring migration
- Mapping of legacy module paths to new directory structure
- Identification of missing index files

#### Step 1.2: Create Index.ts Entrypoints

For each package, create `index.ts` files in standard directories:

**Frontend Entrypoint** (`lib/frontend/index.ts`):

```typescript
// lib/frontend/index.ts
// Pure module - no side effects on import
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Explicit initialization logic
  // ...
}

// Re-export types and utilities if needed
export * from '../browser/your-module.js';
```

**Backend Entrypoint** (`lib/backend/index.ts`):

```typescript
// lib/backend/index.ts
// Pure module - no side effects on import
export function initialize(container: Container, registry: ServiceRegistry): void {
  // Explicit initialization logic
  // ...
}

// Re-export types and utilities if needed
export * from '../node/your-module.js';
```

**Key Requirements**:
- All index files must be `.ts` (not `.js`)
- No side effects on import - only export functions/types
- Use explicit initialization functions
- Follow pure module pattern

#### Step 1.3: Update Package Structure

For each package:
1. Create `lib/frontend/index.ts` (if frontend module exists)
2. Create `lib/backend/index.ts` (if backend module exists)
3. Create `lib/frontend-electron/index.ts` (if Electron frontend exists)
4. Create `lib/backend-electron/index.ts` (if Electron backend exists)
5. Create `lib/electron-main/index.ts` (if Electron main exists)
6. Create `lib/preload/index.ts` (if preload exists)
7. Create `lib/secondary-window/index.ts` (if secondary window exists)

**Validation**:

```bash
# Verify index.ts files exist
find packages -name "index.ts" -path "*/lib/frontend/*" | sort
find packages -name "index.ts" -path "*/lib/backend/*" | sort
```

### Phase 2: Application Migration

**Goal**: Update applications to use static imports from `index.ts` files.

#### Step 2.1: Generate Application Entry Points

Create entry point generators that:
1. Discover `index.ts` files in standard directories
2. Generate static import statements
3. Generate explicit initialization function calls

**Frontend Entry Point** (`src-gen/frontend/index.ts`):

```typescript
// src-gen/frontend/index.ts
import 'reflect-metadata';
import { Container } from 'inversify';
import { ServiceRegistry } from '@theia/core/lib/common/service-registry.js';

// Static imports from index.ts files
import { initialize as initializeCore } from '@theia/core/lib/frontend/index.ts';
import { initialize as initializeAiMcp } from '@theia/ai-mcp/lib/frontend/index.ts';
// ... all frontend modules

// Bootstrap
const container = new Container();
const registry = new ServiceRegistry();

// Explicit initialization (no side effects on import)
initializeCore(container, registry);
initializeAiMcp(container, registry);
// ... initialize all modules

// Start application
// ...
```

**Backend Entry Point** (`src-gen/backend/main.ts`):

```typescript
// src-gen/backend/main.ts
import 'reflect-metadata';
import { Container } from 'inversify';
import { ServiceRegistry } from '@theia/core/lib/common/service-registry.js';

// Static imports from index.ts files
import { initialize as initializeCore } from '@theia/core/lib/backend/index.ts';
import { initialize as initializeAiMcp } from '@theia/ai-mcp/lib/backend/index.ts';
// ... all backend modules

// Bootstrap
const container = new Container();
const registry = new ServiceRegistry();

// Explicit initialization (no side effects on import)
initializeCore(container, registry);
initializeAiMcp(container, registry);
// ... initialize all modules

// Start backend application
// ...
```

#### Step 2.2: Update Build Scripts

Update build scripts to:
1. Generate entry points from discovered `index.ts` files
2. Support direct `.ts` file execution (no compilation step)
3. Configure Service Worker for frontend `.ts` loading
4. Configure Node.js `--experimental-strip-types` for backend

### Phase 3: Service Worker Integration (Frontend)

**Goal**: Enable direct `.ts` file loading in browser via Service Worker.

#### Step 3.1: Implement Service Worker

Create Service Worker that:
1. Intercepts `.ts` file requests
2. Uses Babel to strip types on-the-fly
3. Caches processed JavaScript in browser cache
4. Serves cached results for subsequent requests

**Location**: `lib/frontend/service-worker.ts`

#### Step 3.2: Register Service Worker

Update frontend entry point to register Service Worker:

```typescript
// src-gen/frontend/index.ts
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then((registration) => {
      console.log('Service Worker registered');
    });
}
```

### Phase 4: Backend Direct Execution

**Goal**: Enable direct `.ts` file execution in Node.js.

#### Step 4.1: Configure Node.js Execution

Update backend startup scripts to use `--experimental-strip-types`:

```bash
node --experimental-strip-types --loader ./loader.mjs src-gen/backend/main.ts
```

#### Step 4.2: Remove Build Steps

Eliminate TypeScript compilation for backend:
- Backend runs directly from `.ts` files
- No `tsc --build` required for backend
- Only native addons need building (one-time)

### Phase 5: Testing & Validation

**Goal**: Ensure all functionality works with new build process.

#### Step 5.1: Unit Tests

- Verify all modules can be imported
- Test initialization functions
- Verify no side effects on import

#### Step 5.2: Integration Tests

- Test frontend with Service Worker
- Test backend with direct `.ts` execution
- Verify all features work correctly

#### Step 5.3: Performance Tests

- Measure Service Worker caching effectiveness
- Compare build times (should be zero for backend)
- Verify tree-shaking works correctly

### Phase 6: Legacy Removal

**Goal**: Remove deprecated `@theia/application-package` and `@theia/application-manager`.

#### Step 6.1: Remove Dependencies

Remove from all `package.json` files:

```json
{
  "devDependencies": {
    // Remove these:
    // "@theia/application-package": "...",
    // "@theia/application-manager": "..."
  }
}
```

#### Step 6.2: Remove Legacy Code

- Delete `dev-packages/application-package/`
- Delete `dev-packages/application-manager/`
- Remove all `theiaExtensions` from `package.json` files

#### Step 6.3: Update Documentation

- Mark legacy packages as removed
- Update all references to new approach
- Archive legacy documentation

## Implementation Strategy

### Incremental Migration

1. **Start with Core Packages**: Migrate `@theia/core` first
2. **Migrate Dependencies**: Migrate packages that depend on core
3. **Migrate Applications**: Update applications to use new entry points
4. **Remove Legacy**: Once all packages are migrated, remove legacy code

### Backward Compatibility

During migration:
- Support both legacy and new approaches
- Legacy packages continue to work
- New packages use new convention
- Applications can mix both (temporary)

### Rollout Plan

1. **Week 1-2**: Phase 1 - Create index.ts files for core packages
2. **Week 3-4**: Phase 2 - Update application entry points
3. **Week 5-6**: Phase 3-4 - Service Worker and backend direct execution
4. **Week 7-8**: Phase 5 - Testing and validation
5. **Week 9-10**: Phase 6 - Legacy removal

## Success Criteria

- [ ] All packages have `index.ts` entrypoints in standard directories
- [ ] Applications use static imports from `index.ts` files
- [ ] Frontend loads `.ts` files directly via Service Worker
- [ ] Backend runs `.ts` files directly with `--experimental-strip-types`
- [ ] No build step required for backend (after native addons)
- [ ] No build step required for frontend (Service Worker handles it)
- [ ] All tests pass
- [ ] Legacy packages removed
- [ ] Documentation updated

## Tools & Scripts

### Discovery Script

```typescript
// scripts/discover-index-files.ts
// Discovers all index.ts files in standard directories
```

### Entry Point Generator

```typescript
// scripts/generate-entry-points.ts
// Generates application entry points from discovered index.ts files
```

### Validation Script

```typescript
// scripts/validate-convention.ts
// Validates all packages follow directory convention
```

## Related Documentation

- [Directory Convention Specification](./DIRECTORY_CONVENTION.md)
- [ESM Migration Guide](./ESM_MIGRATION.md)
- [Build Process Documentation](./BUILD_PROCESS.md)
- [Deprecation Notice](./DEPRECATE_Application.md)

## Timeline

- **Start Date**: [To be determined]
- **Target Completion**: [To be determined]
- **Milestones**: See "Rollout Plan" above

## Risks & Mitigation

### Risk: Breaking Changes

**Mitigation**:
- Maintain backward compatibility during migration
- Gradual rollout with testing at each phase
- Clear migration path documented

### Risk: Service Worker Compatibility

**Mitigation**:
- Test in all target browsers
- Provide fallback to compiled `.js` files
- Document browser requirements

### Risk: Node.js Version Requirements

**Mitigation**:
- Require Node.js 22+ for backend
- Document version requirements clearly
- Provide migration guide for older versions

## Next Steps

1. Review and approve this plan
2. Assign team members to phases
3. Create tracking issues for each phase
4. Begin Phase 1: Foundation - Directory Convention Implementation
