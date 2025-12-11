# Build Process Documentation

This document describes the new build process for Theia applications using the ESM directory convention with native ESM execution.

## Overview

The new build process replaces the legacy `application-package` and `application-manager` abstraction with a simpler, native ESM-based approach:
- **Backend**: Runs directly with Node.js 22+ using `--experimental-strip-types` (no bundling required)
- **Frontend**: Can directly import `.ts` files via Service Worker (Babel strips types, results cached in browser)
- **Frontend Alternative**: Optional `tsc --build` for TypeScript compilation (bundling is optional)
- **Native Addons**: Built once if needed, then backend is build-step free
- This enables faster development cycles, better debugging, and simpler deployment

## Build Flow

### Legacy Process (Deprecated)

```bash
1. ApplicationPackage scans package.json files
   ↓
2. Discovers theiaExtensions metadata
   ↓
3. Extracts module paths
   ↓
4. ApplicationPackageManager generates entry files
   ↓
5. Generates dynamic import statements
   ↓
6. Bundler processes generated files
```

### New Process

```bash
Backend:
1. Build native addons (once, if needed)
   ↓
2. Run directly with Node.js 22+ --experimental-strip-types
   (No bundling, no build step after initial native addon build)

Frontend:
Option 1 (Recommended):
1. Service Worker intercepts .ts file requests
   ↓
2. Babel strips types on-the-fly
   ↓
3. Results cached in browser cache
   (No compilation step required)

Option 2 (Alternative):
1. TypeScript compilation: tsc --build (optional)
   ↓
2. Optional: Bundle for production (if desired)
   ↓
3. Serve or deploy compiled files
```

## Backend Build Process

### Native ESM Execution

Backend code runs **directly** with Node.js 22+ using the `--experimental-strip-types` flag. No bundling or build step is required after native addons are built.

**Running Backend:**

```bash
# Run backend directly with TypeScript stripping
node --experimental-strip-types --loader ./loader.mjs src-gen/backend/main.js

# Or with environment variables
NODE_OPTIONS="--experimental-strip-types --loader ./loader.mjs" node src-gen/backend/main.js
```

### Backend Entry Point

**Location**: `src-gen/backend/main.ts` (runs directly with Node.js 22+ `--experimental-strip-types`)

**Example:**

```typescript
import 'reflect-metadata';
import { Container } from 'inversify';
import { ServiceRegistry } from '@theia/core/lib/common/service-registry.js';

// Import initialization functions (no side effects)
// Can reference .ts files directly - Node.js strips types at runtime
import { initialize as initializeAiMcp } from '@theia/ai-mcp/lib/backend/index.ts';
import { initialize as initializeAiChat } from '@theia/ai-chat/lib/backend/index.ts';
import { initialize as initializeCore } from '@theia/core/lib/backend/index.ts';
// ... all backend modules

// Bootstrap code
const container = new Container();
const registry = new ServiceRegistry();

// Explicitly call initialization functions
initializeCore(container, registry);
initializeAiMcp(container, registry);
initializeAiChat(container, registry);
// ... call all backend initialization functions

// Start backend application
// ...
```

### Native Addons

Native addons (if any) need to be built once:

```bash
# Build native addons (one-time setup)
npm run rebuild:native

# After this, backend runs without any build step
```

## Frontend Build Process

### Direct TypeScript Loading via Service Worker

Frontend can **directly import `.ts` files** - no TypeScript compilation step required! The Service Worker intercepts `.ts` file requests, processes them with Babel to strip types, and caches the result in the browser cache.

**Benefits:**
- **No Build Step**: Frontend code can reference `.ts` files directly
- **Browser Caching**: Babel-stripped results are cached for fast subsequent loads
- **Faster Development**: No compilation wait time
- **Type Safety**: TypeScript types are checked but not compiled away

### Frontend Entry Point

**Location**: `src-gen/frontend/index.ts` (can be `.ts` directly, no compilation needed)

**Example:**

```typescript
import 'reflect-metadata';
import { Container } from 'inversify';
import { ServiceRegistry } from '@theia/core/lib/common/service-registry.js';

// Import initialization functions directly from .ts files (no side effects)
import { initialize as initializeAiMcp } from '@theia/ai-mcp/lib/frontend/index.ts';
import { initialize as initializeAiChat } from '@theia/ai-chat/lib/frontend/index.ts';
import { initialize as initializeCore } from '@theia/core/lib/frontend/index.ts';
// ... all frontend modules (can reference .ts files directly)

// Bootstrap code
const container = new Container();
const registry = new ServiceRegistry();

// Explicitly call initialization functions
initializeCore(container, registry);
initializeAiMcp(container, registry);
initializeAiChat(container, registry);
// ... call all frontend initialization functions

// Start frontend application
// ...
```

### Optional TypeScript Compilation

If you prefer to compile TypeScript ahead of time (optional):

```bash
# Optional: Compile TypeScript to JavaScript
tsc --build

# Output goes to lib/ directory
# Files can be served directly or bundled (optional)
```

### Frontend Loading and Caching via Service Worker

Frontend loading and caching is handled via the **Service Worker API**. This provides:

- **Module Loading**: Service Worker intercepts module requests and serves cached or network resources
- **Caching Strategy**: Intelligent caching of ESM modules for offline support and faster loads
- **Backend Mocking**: Service Worker can intercept backend requests, enabling better testing with mock backends
- **Development Testing**: Mock backend responses without changing application code

**Service Worker Registration:**

```javascript
// lib/frontend/service-worker.js
// Service Worker handles module loading and caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle ESM module requests
  if (url.pathname.endsWith('.js') && event.request.mode === 'cors') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          const responseClone = fetchResponse.clone();
          caches.open('theia-modules-v1').then((cache) => {
            cache.put(event.request, responseClone);
          });
          return fetchResponse;
        });
      })
    );
  }
  
  // Intercept backend API requests for mocking
  if (url.pathname.startsWith('/api/')) {
    // Check for mock responses first
    const mockResponse = getMockResponse(event.request);
    if (mockResponse) {
      return event.respondWith(mockResponse);
    }
    // Otherwise, proxy to real backend
    return event.respondWith(fetch(event.request));
  }
});
```

**Service Worker Registration in Entry Point:**

```javascript
// lib/frontend/index.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then((registration) => {
      console.log('Service Worker registered:', registration);
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
}
```

**Backend Mocking for Testing:**

```javascript
// test/mocks/service-worker-mocks.js
// Mock backend responses in Service Worker
function getMockResponse(request) {
  const url = new URL(request.url);
  
  // Mock specific API endpoints
  if (url.pathname === '/api/workspace') {
    return new Response(JSON.stringify({
      workspace: '/mock/workspace',
      files: ['file1.js', 'file2.js']
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return null; // No mock, use real backend
}
```

### Optional Frontend Production Bundling (Alternative)

Bundling is **optional** and only recommended if you want to reduce HTTP requests. Service Worker handles module loading efficiently even without bundling, so bundling is less necessary.

```bash
# Optional: Bundle for production
npm run bundle:frontend
```

### Entry Point Generation Script (Optional)

A build-time script can discover available modules and generate entry points:

**`scripts/discover-modules.mjs`:**

```javascript
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

function discoverModules(type) {
  const nodeModules = 'node_modules';
  const theiaDir = join(nodeModules, '@theia');
  
  if (!existsSync(theiaDir)) {
    return [];
  }
  
  const packages = readdirSync(theiaDir);
  const modules = [];
  
  for (const pkg of packages) {
    // Check for .ts files first (preferred for frontend with Service Worker)
    const tsIndexPath = join(theiaDir, pkg, 'lib', type, 'index.ts');
    const jsIndexPath = join(theiaDir, pkg, 'lib', type, 'index.js');
    
    if (existsSync(tsIndexPath)) {
      modules.push({
        path: `@theia/${pkg}/lib/${type}/index.ts`,
        name: pkg.replace(/-/g, '_')
      });
    } else if (existsSync(jsIndexPath)) {
      modules.push({
        path: `@theia/${pkg}/lib/${type}/index.js`,
        name: pkg.replace(/-/g, '_')
      });
    }
  }
  
  return modules.sort((a, b) => a.path.localeCompare(b.path));
}

export function discoverFrontendModules() {
  return discoverModules('frontend');
}

export function discoverBackendModules() {
  return discoverModules('backend');
}

export function discoverElectronMainModules() {
  return discoverModules('electron-main');
}
```

**`scripts/generate-entry.mjs`:**

```javascript
import { writeFileSync } from 'fs';
import { discoverFrontendModules, discoverBackendModules } from './discover-modules.mjs';

function generateFrontendEntry() {
  const modules = discoverFrontendModules();
  const imports = modules
    .map(m => `import { initialize as initialize${m.name} } from '${m.path}';`)
    .join('\n');
  
  const initializations = modules
    .map(m => `initialize${m.name}(container, registry);`)
    .join('\n');
  
  const entry = `import 'reflect-metadata';
import { Container } from 'inversify';
import { ServiceRegistry } from '@theia/core/lib/common/service-registry.js';

${imports}

// Bootstrap code
const container = new Container();
const registry = new ServiceRegistry();

// Store in window for compatibility
(window['theia'] = window['theia'] || {}).registry = registry;
(window['theia'] = window['theia'] || {}).container = container;

// Explicitly initialize all modules (no side effects on import)
${initializations}

// Application startup
// ...
`;

  writeFileSync('src-gen/frontend/index.ts', entry);
}

function generateBackendEntry() {
  const modules = discoverBackendModules();
  const imports = modules
    .map(m => `import { initialize as initialize${m.name} } from '${m.path}';`)
    .join('\n');
  
  const initializations = modules
    .map(m => `initialize${m.name}(container, registry);`)
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

// Backend initialization
// ...
`;

  writeFileSync('src-gen/backend/main.ts', entry);
}

generateFrontendEntry();
generateBackendEntry();
```

## Optional Frontend Bundling Configuration

**Note**: Bundling is **optional** and only recommended for production frontend builds to reduce HTTP requests. Service Worker handles module loading efficiently, making bundling less critical. Backend does not require bundling.

### Rollup Configuration (Optional - Frontend Only)

**`rollup.config.js`:**

```javascript
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'lib/frontend/index.js', // Use compiled JS, not TS
  output: {
    file: 'lib/frontend/bundle.js',
    format: 'es',
    sourcemap: true
  },
  external: (id) => {
    // Externalize @theia packages (they're loaded as separate modules)
    if (id.startsWith('@theia/')) {
      return true;
    }
    // Externalize Node.js built-ins
    if (id.startsWith('node:') || !id.includes('/')) {
      return true;
    }
    return false;
  },
  plugins: [
    nodeResolve({
      preferBuiltins: false,
      browser: true
    }),
    typescript({
      tsconfig: 'tsconfig.json'
    })
  ]
};
```

### Webpack Configuration (Optional - Frontend Only)

**`webpack.config.js`:**

```javascript
const path = require('path');

module.exports = {
  entry: './lib/frontend/index.js', // Use compiled JS
  output: {
    path: path.resolve(__dirname, 'lib/frontend'),
    filename: 'bundle.js',
    library: {
      type: 'module'
    }
  },
  experiments: {
    outputModule: true
  },
  externals: {
    // Externalize @theia packages
    /^@theia\//: 'commonjs @theia/'
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  }
};
```

## Build Scripts

### Package.json Scripts

**`package.json`:**

```json
{
  "scripts": {
    "generate:entry": "node scripts/generate-entry.mjs",
    "compile": "tsc --build",
    "rebuild:native": "node-gyp rebuild",
    "start:backend": "node --experimental-strip-types --loader ./loader.mjs lib/backend/main.js",
    "start:frontend": "node lib/frontend/index.js",
    "bundle:frontend": "rollup -c rollup.config.js",
    "build": "npm run generate:entry && npm run compile && npm run rebuild:native"
  }
}
```

### Build Steps

1. **Generate Entry Files (Optional)**

   ```bash
   npm run generate:entry
   ```

   - Discovers all available modules
   - Generates `src-gen/frontend/index.js`
   - Generates `src-gen/backend/main.js`

2. **Compile TypeScript (Optional for Frontend)**

   ```bash
   npm run compile
   # or
   tsc --build
   ```

   - **Backend**: Compiles TypeScript to JavaScript (required for Node.js)
   - **Frontend**: Optional - Service Worker can load `.ts` files directly
   - Outputs to `lib/` directories
   - Frontend: `lib/frontend/index.ts` (or `.js` if compiled)
   - Backend: `lib/backend/main.ts` (compiled to `.js` for Node.js)

3. **Build Native Addons (One-Time, If Needed)**

   ```bash
   npm run rebuild:native
   ```

   - Builds native Node.js addons
   - Only needed once or when native dependencies change
   - After this, backend is build-step free

4. **Run Backend (No Build Step)**

   ```bash
   npm run start:backend
   # or
   node --experimental-strip-types --loader ./loader.mjs lib/backend/main.ts
   ```

   - Runs directly with Node.js 22+
   - No bundling or additional build step required

5. **Serve Frontend (No Build Step Required)**

   ```bash
   # Frontend can load .ts files directly via Service Worker
   # No compilation needed - Service Worker handles type stripping
   npm run serve:frontend
   ```

   - Service Worker intercepts `.ts` file requests
   - Babel strips types on-the-fly
   - Results are cached in browser cache
   - No compilation step required

6. **Optional: Compile Frontend TypeScript**

   ```bash
   npm run compile:frontend
   # or
   tsc --build --project tsconfig.frontend.json
   ```

   - Optional: Pre-compile TypeScript if preferred
   - Service Worker can still cache compiled `.js` files

7. **Optional: Bundle Frontend (Production Only)**

   ```bash
   npm run bundle:frontend
   ```

   - Only needed for production optimization
   - Reduces HTTP requests
   - Not required for development

## Target-Specific Execution

### Browser Target

**Frontend:**
- **Option 1 (Recommended)**: Serve `.ts` files directly - Service Worker handles type stripping and caching
- **Option 2**: Compile: `tsc --build` (optional)
- Serve: `lib/frontend/index.ts` (or `.js` if compiled)
- Optional bundling for production

**Backend:**
- Compile: `tsc --build`
- Run: `node --experimental-strip-types lib/backend/main.ts`

### Electron Target

**Frontend:**
- Uses `lib/frontend-electron/index.ts` (if exists) or `lib/frontend/index.ts`
- **Option 1**: Serve `.ts` files directly - Service Worker handles type stripping
- **Option 2**: Compile: `tsc --build` (optional)
- Optional bundling

**Backend:**
- Uses `lib/backend-electron/index.ts` (if exists) or `lib/backend/index.ts`
- Compile: `tsc --build`
- Run: `node --experimental-strip-types lib/backend/main.ts`

**Electron Main:**
- Uses `lib/electron-main/index.ts`
- Compile: `tsc --build`
- Run: `node --experimental-strip-types lib/electron-main/index.ts`

### Browser-Only Target

**Frontend:**
- **Option 1 (Recommended)**: Serve `.ts` files directly - Service Worker handles type stripping and caching
- **Option 2**: Compile: `tsc --build` (optional)
- Serve: `lib/frontend/index.ts` (or `.js` if compiled)
- Optional bundling for production

**Backend:**
- Not used (browser-only)

## Build Optimization

### Native ESM Benefits

With native ESM execution:
- **No bundling overhead**: Direct module loading
- **Faster development**: Instant restarts, no build wait
- **Direct TypeScript**: Frontend can import `.ts` files directly via Service Worker
- **Browser Caching**: Babel-stripped TypeScript results cached automatically
- **Better debugging**: Source maps point to original `.ts` files
- **Simpler deployment**: Just copy `lib/` directory (or `src/` with Service Worker)

### Frontend Module Loading via Service Worker

Frontend loading and caching is handled via the **Service Worker API**. This provides:

- **Direct TypeScript Loading**: Service Worker intercepts `.ts` file requests and processes them with Babel to strip types
- **Browser Caching**: Babel-stripped results are cached in browser cache for fast subsequent loads
- **Module Loading**: Service Worker intercepts module requests and serves cached or network resources
- **Caching Strategy**: Intelligent caching of ESM modules (both `.ts` and `.js`) for offline support and faster loads
- **Backend Mocking**: Service Worker can intercept backend requests, enabling better testing with mock backends
- **Development Testing**: Mock backend responses without changing application code

**Service Worker with TypeScript Support:**

```javascript
// lib/frontend/service-worker.js
// Service Worker handles .ts file loading, type stripping, and caching
importScripts('https://unpkg.com/@babel/standalone@7/babel.min.js');

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle TypeScript (.ts) file requests
  if (url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Fetch .ts file and process with Babel
        return fetch(event.request).then((fetchResponse) => {
          return fetchResponse.text().then((tsCode) => {
            // Strip types using Babel
            const jsCode = Babel.transform(tsCode, {
              presets: ['typescript'],
              filename: url.pathname
            }).code;
            
            // Create JavaScript response
            const jsResponse = new Response(jsCode, {
              headers: {
                'Content-Type': 'application/javascript',
                'Cache-Control': 'public, max-age=31536000'
              }
            });
            
            // Cache the processed result
            const responseClone = jsResponse.clone();
            caches.open('theia-ts-cache-v1').then((cache) => {
              cache.put(event.request, responseClone);
            });
            
            return jsResponse;
          });
        });
      })
    );
  }
  
  // Handle JavaScript (.js) module requests
  if (url.pathname.endsWith('.js') && event.request.mode === 'cors') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          const responseClone = fetchResponse.clone();
          caches.open('theia-modules-v1').then((cache) => {
            cache.put(event.request, responseClone);
          });
          return fetchResponse;
        });
      })
    );
  }
  
  // Intercept backend API requests for mocking
  if (url.pathname.startsWith('/api/')) {
    // Check for mock responses first
    const mockResponse = getMockResponse(event.request);
    if (mockResponse) {
      return event.respondWith(mockResponse);
    }
    // Otherwise, proxy to real backend
    return event.respondWith(fetch(event.request));
  }
});
```

**Service Worker Registration in Entry Point:**

```javascript
// lib/frontend/index.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then((registration) => {
      console.log('Service Worker registered:', registration);
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
}
```

**Backend Mocking for Testing:**

```javascript
// test/mocks/service-worker-mocks.js
// Mock backend responses in Service Worker
function getMockResponse(request) {
  const url = new URL(request.url);
  
  // Mock specific API endpoints
  if (url.pathname === '/api/workspace') {
    return new Response(JSON.stringify({
      workspace: '/mock/workspace',
      files: ['file1.js', 'file2.js']
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return null; // No mock, use real backend
}
```

### Optional Frontend Production Bundling

Bundling is optional and only recommended if you want to reduce HTTP requests. Service Worker handles module loading efficiently even without bundling, making bundling less necessary.

If bundling frontend for production:

**Tree-Shaking:**
- Bundler can analyze static imports
- Removes unused code automatically

**Code Splitting:**

```javascript
// Rollup code splitting (optional)
export default {
  input: 'lib/frontend/index.js',
  output: {
    dir: 'lib/frontend',
    format: 'es',
    manualChunks: (id) => {
      if (id.includes('@theia/')) {
        const match = id.match(/@theia\/([^/]+)/);
        return match ? match[1] : null;
      }
    }
  }
};
```

### Development vs Production

**Development:**
- Backend: Run directly, no build step
- Frontend: `tsc --build` only, no bundling
- Fast iteration cycles
- Source maps enabled

**Production:**
- Backend: Run directly, no build step
- Frontend: `tsc --build` + optional bundling
- Optional minification if bundling
- Source maps optional

## Build Tools

### Required Tools

- **Node.js**: 22+ with `--experimental-strip-types` support (for backend)
- **Service Worker**: Built into browsers (for frontend `.ts` loading)
- **Babel Standalone**: For stripping types in Service Worker (loaded via CDN or bundled)
- **Build Scripts**: For entry generation (optional)

### Optional Tools

- **TypeScript Compiler**: Only if you want to pre-compile frontend (optional)
- **Bundler** (Rollup/Webpack): Only for frontend production bundling (optional)
- **node-gyp**: For building native addons (if needed, one-time)
- **ESBuild/SWC**: Faster TypeScript compilation (alternative to tsc, optional)

## Troubleshooting

### Issue: Missing Modules

**Problem**: Entry file imports modules that don't exist

**Solution**:
1. Check discovery script finds all packages
2. Verify index files exist
3. Check package installation

### Issue: Circular Dependencies

**Problem**: Circular dependencies detected

**Solution**:
1. Ensure modules have no side effects on import
2. Use initialization functions that are explicitly called
3. Pass dependencies as parameters instead of importing directly
4. See [ESM Migration Guide](./ESM_MIGRATION.md) for detailed patterns

### Issue: Build Performance

**Problem**: Build is slow

**Solution**:
1. Backend: No build step needed, runs directly
2. Frontend: Use ESBuild or SWC for faster TypeScript compilation
3. Service Worker: Handles caching automatically
4. Enable TypeScript incremental builds
5. Parallelize builds if needed

### Issue: Bundle Size

**Problem**: Bundle is too large (if using optional bundling)

**Solution**:
1. **Skip Bundling**: Service Worker handles module loading efficiently without bundling
2. Enable tree-shaking if bundling
3. Use code splitting if bundling
4. Externalize large dependencies
5. Review what's being bundled
6. Consider using Service Worker caching instead of bundling

## Migration from Legacy

### Step 1: Remove Legacy Dependencies

```json
{
  "devDependencies": {
    // Remove these:
    // "@theia/application-package": "...",
    // "@theia/application-manager": "..."
  }
}
```

### Step 2: Add Build Scripts

Add entry generation and build scripts to `package.json`.

### Step 3: Update Build Configuration

Replace generated configs with standard bundler configuration.

### Step 4: Test Build

Verify the build works correctly:

```bash
# Compile TypeScript
tsc --build

# Run backend (no build step needed)
node --experimental-strip-types lib/backend/main.ts

# Test frontend (optional bundling)
npm run bundle:frontend
```

## Build Best Practices

1. **No Side Effects**: Modules must have no side effects on import
2. **Explicit Initialization**: Use initialization functions that are explicitly called
3. **Native ESM**: Leverage Node.js 22+ native ESM execution for backend
4. **Minimal Build Steps**: Backend is build-step free after native addons
5. **TypeScript Only**: Frontend only needs `tsc --build`, bundling is optional
6. **Development Speed**: Skip bundling in development for faster iteration
7. **Production Bundling**: Only bundle frontend for production if needed
8. **Documentation**: Document any special build requirements

## Related Documentation

- [ESM Migration Guide](./ESM_MIGRATION.md)
- [Directory Convention Specification](./DIRECTORY_CONVENTION.md)
- [Deprecation Notice](./DEPRECATE_Application.md)
