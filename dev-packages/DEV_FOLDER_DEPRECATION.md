# Deprecation Plan: Dev-Packages Folder Abstractions

## Overview

This document outlines the deprecation plan for legacy abstractions and build-time tools in the `dev-packages` folder. These packages were created to work around limitations in the pre-ESM era and are no longer needed with the modern build-step-free approach.

**Note**: `@theia/application-package` and `@theia/application-manager` are already covered in [DEPRECATE_Application.md](./DEPRECATE_Application.md) and are excluded from this plan.

## Packages to Deprecate

### 1. `@theia/native-webpack-plugin`

**Purpose**: Webpack plugin for handling native dependencies (ripgrep, node-pty, trash, bindings) during bundling.

**Why Deprecate**:
- **Webpack-Specific**: Only works with webpack bundling
- **Build-Time Dependency**: Not needed with build-step-free execution
- **Native Addon Handling**: Native addons can be built once and loaded directly
- **Complexity**: Adds unnecessary abstraction layer for native module resolution

**Replacement Strategy**:
- Native addons are built once using `node-gyp` or similar
- Backend runs directly with Node.js 22+ `--experimental-strip-types`
- No webpack plugin needed - native modules are loaded directly by Node.js
- Frontend doesn't bundle native modules (they run in backend)

**Migration Steps**:
1. Build native addons once: `npm run rebuild:native`
2. Remove webpack plugin from build configuration
3. Native modules are loaded directly by Node.js at runtime
4. No special handling needed in build process

**Timeline**: Deprecate after build-step-free migration is complete

### 2. `@theia/cli`

**Purpose**: Command-line tool for managing Theia applications (build, watch, start, test, etc.). Uses `@theia/application-manager` and `@theia/application-package` internally.

**Why Deprecate**:
- **Depends on Deprecated Packages**: Uses `application-manager` and `application-package`
- **Build-Time Code Generation**: Generates entry files and webpack configs
- **Complex Abstraction**: Wraps standard tools (webpack, node) with custom logic
- **Not Needed**: Standard npm scripts and tools can replace CLI commands

**Replacement Strategy**:
- Use standard npm scripts in `package.json`
- Use `tsc --build` for TypeScript compilation
- Use `node --experimental-strip-types` for backend execution
- Use standard test runners (mocha, jest, etc.)
- Use standard bundlers (rollup, webpack) directly if needed

**Migration Steps**:
1. Replace `theia build` with `tsc --build`
2. Replace `theia start` with `node --experimental-strip-types lib/backend/main.ts`
3. Replace `theia test` with standard test runner
4. Replace `theia rebuild` with `node-gyp rebuild` or similar
5. Remove CLI dependency from applications

**Timeline**: Deprecate after `application-manager` and `application-package` are removed

### 3. `@theia/re-export` (private-re-exports)

**Purpose**: Generates re-export files based on `theiaReExports` metadata in `package.json`. Creates `index.js` and `index.d.ts` files that re-export dependencies.

**Why Deprecate**:
- **Code Generation**: Generates files at build time based on metadata
- **Metadata-Driven**: Uses `theiaReExports` in `package.json` (similar to `theiaExtensions`)
- **Build-Time Dependency**: Requires build step to generate re-exports
- **Not Needed with ESM**: Direct ESM imports replace the need for generated re-exports

**Replacement Strategy**:
- Use direct ESM imports instead of re-exports
- Import directly from dependencies: `import { X } from '@dependency/package'`
- Use standard ESM re-export syntax if needed: `export { X } from '@dependency/package'`
- No code generation needed - all imports are static and known at build time

**Migration Steps**:
1. Remove `theiaReExports` from `package.json` files
2. Replace generated re-export imports with direct imports
3. Update all consumers to import directly from dependencies
4. Remove re-export generation from build process

**Timeline**: Deprecate as part of ESM migration

### 4. `@theia/ext-scripts` (private-ext-scripts)

**Purpose**: Shared npm scripts abstraction. Allows packages to define scripts with `ext:` prefix that can be called via `theiaext` command.

**Why Deprecate**:
- **Abstraction Layer**: Adds unnecessary abstraction over standard npm scripts
- **Build-Time Tool**: Requires special tooling to resolve and execute scripts
- **Not Standard**: Uses custom `theiaext` command instead of standard `npm run`
- **Complexity**: Adds indirection that makes scripts harder to understand

**Replacement Strategy**:
- Use standard npm scripts directly in `package.json`
- Share common scripts via workspace-level scripts or shared package
- Use standard npm/yarn workspace features for script sharing
- No special tooling needed

**Migration Steps**:
1. Move shared scripts to workspace root or shared package
2. Update all packages to use standard `npm run` commands
3. Remove `theiaext` command usage
4. Remove `ext-scripts` dependency

**Timeline**: Deprecate as part of build simplification

### 5. `@theia/localization-manager`

**Purpose**: Extracts localization keys from `nls.localize` calls and generates `nls.json` files. Also provides DeepL translation integration.

**Why Deprecate**:
- **Build-Time Code Generation**: Scans source files and generates JSON files
- **TypeScript Compiler API**: Uses TypeScript compiler API for static analysis
- **Complex Extraction**: Complex logic to extract and validate localization calls
- **Could Be Simplified**: Modern tools (TypeScript transformers, ESLint) could replace this

**Replacement Strategy**:
- Use TypeScript transformers or ESLint rules to extract localization keys
- Use standard i18n tools (i18next, react-intl, etc.) if needed
- Generate localization files as part of TypeScript compilation if needed
- Or keep but simplify - this might be useful enough to keep but review

**Migration Steps** (if deprecating):
1. Evaluate if localization extraction is still needed
2. Replace with TypeScript transformer or ESLint rule
3. Update build process to use new extraction method
4. Remove `localization-manager` dependency

**Timeline**: Review and potentially keep (useful tool) or deprecate if better alternative exists

## Packages to Keep (For Now)

### `@theia/eslint-plugin` (private-eslint-plugin)

**Status**: **Keep** - Useful development tool

**Reason**: Provides valuable ESLint rules for Theia development (annotation-check, localization-check, no-src-import, etc.). These are runtime checks that help developers, not build-time abstractions.

---

### `@theia/test-setup` (private-test-setup)

**Status**: **Keep** - Useful development tool

**Reason**: Provides test setup script for mocha. This is a standard development tool, not a build abstraction.

---

### `@theia/ovsx-client`

**Status**: **Keep** - Runtime dependency

**Reason**: Runtime client for Open VSX registry. This is a runtime dependency, not a build-time abstraction.

---

### `@theia/request`

**Status**: **Keep** - Runtime dependency

**Reason**: HTTP request utility with proxy support. This is a runtime dependency, not a build-time abstraction.

### `@theia/ffmpeg`

**Status**: **Keep** - Runtime dependency

**Reason**: Native addon for ffmpeg codec detection. This is a runtime dependency, not a build-time abstraction.

## Deprecation Timeline

### Phase 1: Preparation (Current)

- [x] Create this deprecation document
- [ ] Audit all packages using deprecated tools
- [ ] Create migration guides for each package

### Phase 2: Build Process Migration (After Application Package Removal)

- [ ] Remove `native-webpack-plugin` usage
- [ ] Replace `@theia/cli` commands with standard npm scripts
- [ ] Update all applications to use standard build tools

### Phase 3: Code Generation Removal (During ESM Migration)

- [ ] Remove `theiaReExports` metadata
- [ ] Replace generated re-exports with direct imports
- [ ] Remove `re-export` package

### Phase 4: Script Simplification

- [ ] Replace `ext-scripts` with standard npm scripts
- [ ] Remove `ext-scripts` package

### Phase 5: Localization Review

- [ ] Evaluate `localization-manager` necessity
- [ ] Either simplify or replace with better alternative
- [ ] Deprecate if replaced

### Phase 6: Final Cleanup

- [ ] Remove all deprecated packages
- [ ] Update documentation
- [ ] Archive legacy code

## Migration Priority

1. **High Priority** (Blocks build-step-free migration):
   - `native-webpack-plugin` - Must be removed for build-step-free backend
   - `cli` - Depends on deprecated application packages

2. **Medium Priority** (Part of ESM migration):
   - `re-export` - Should be removed with ESM migration
   - `ext-scripts` - Can be simplified

3. **Low Priority** (Review and potentially keep):
   - `localization-manager` - Useful tool, review if replacement needed

## Breaking Changes

### For Application Developers

1. **No More `theia build`**: Use `tsc --build` instead
2. **No More `theia start`**: Use `node --experimental-strip-types lib/backend/main.ts`
3. **No More `theia test`**: Use standard test runner (mocha, jest, etc.)
4. **No More Webpack Plugin**: Native modules handled directly by Node.js
5. **No More Re-Exports**: Import directly from dependencies

### For Package Authors

1. **No More `theiaReExports`**: Use direct ESM imports
2. **No More `ext:` Scripts**: Use standard npm scripts
3. **No More Generated Files**: All imports are static and explicit

## Benefits of Removal

1. ✅ **Simpler Build Process**: No code generation, no special tooling
2. ✅ **Standard Tools**: Use standard npm/yarn/TypeScript tools
3. ✅ **Better IDE Support**: Static imports work better with IDEs
4. ✅ **Faster Builds**: No code generation overhead
5. ✅ **Easier Debugging**: Clear import paths, no generated code
6. ✅ **Better Tree-Shaking**: Static imports enable better optimization
7. ✅ **Standard ESM**: Works with native module loaders

## Related Documentation

- [Deprecation: Application Package & Application Manager](./DEPRECATE_Application.md)
- [Execution Plan: Unification to Build-Step-Free Codebase](./PLAN_EXECUTION_UNIFICATION.md)
- [ESM Migration Guide](./ESM_MIGRATION.md)
- [Directory Convention Specification](./DIRECTORY_CONVENTION.md)
- [Build Process Documentation](./BUILD_PROCESS.md)

## Questions?

For questions or concerns about this deprecation plan, please:
- Open an issue on GitHub
- Check the migration guides
- Review examples in the codebase
