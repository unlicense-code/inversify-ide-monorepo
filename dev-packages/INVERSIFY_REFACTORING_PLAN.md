# Inversify to ECMAScript Modules Refactoring Plan

## Overview
This document outlines the plan to refactor the Theia codebase to remove dependency on Inversify dependency injection framework and migrate to pure ECMAScript modules with static analyzable class syntax.

## Goals
1. Remove all Inversify dependencies (`@theia/core/shared/inversify`)
2. Eliminate dependency injection patterns
3. Use ECMAScript modules exclusively
4. Ensure all code is statically analyzable
5. Maintain functionality while simplifying architecture

## Current Inversify Usage Patterns

### 1. ContainerModule Pattern
```typescript
export default new ContainerModule((bind, unbind, isBound, rebind) => {
    bind(Service).toSelf().inSingletonScope();
    bind(Interface).toService(Service);
});
```

### 2. Injectable Classes
```typescript
@injectable()
export class MyService {
    @inject(Dependency) protected readonly dependency: Dependency;
}
```

### 3. Constructor Injection
```typescript
@injectable()
export class MyService {
    constructor(
        @inject(Dependency1) protected readonly dep1: Dependency1,
        @inject(Dependency2) protected readonly dep2: Dependency2
    ) {}
}
```

### 4. PostConstruct Lifecycle
```typescript
@postConstruct()
protected init(): void {
    // initialization logic
}
```

### 5. Named Bindings
```typescript
@inject(ContributionProvider) @named(Symbol)
protected readonly contributions: ContributionProvider<Contribution>;
```

### 6. Dynamic Value Bindings
```typescript
bind(Service).toDynamicValue(ctx => {
    const provider = ctx.container.get(Provider);
    return provider.create();
});
```

### 7. Factory Bindings
```typescript
bind(Factory).toFactory(ctx => (props) => {
    return createContainer(ctx.container, props).get(Instance);
});
```

### 8. Container Resolution
```typescript
const service = container.get(Service);
```

## Refactoring Strategy

### Phase 1: Analysis and Preparation

#### 1.1 Dependency Graph Analysis
- [ ] Map all dependencies between packages
- [ ] Identify circular dependencies
- [ ] Document singleton requirements
- [ ] List all ContributionProvider usages
- [ ] Identify factory patterns

#### 1.2 Create Migration Utilities
- [ ] Create singleton registry utility
- [ ] Create contribution collection utility
- [ ] Create initialization helper utilities

### Phase 2: Core Infrastructure

#### 2.1 Replace ContainerModule with Module Initialization Functions
**Pattern:**
```typescript
// Before
export default new ContainerModule((bind) => {
    bind(Service).toSelf().inSingletonScope();
});

// After
export function initializeWorkspaceModule(services: ServiceRegistry): void {
    services.registerSingleton(Service, () => new Service());
}
```

#### 2.2 Create Service Registry
**New File:** `packages/core/src/common/service-registry.ts`
```typescript
export class ServiceRegistry {
    private singletons = new Map<symbol | string, any>();
    private factories = new Map<symbol | string, () => any>();
    
    registerSingleton<T>(token: symbol | string, factory: () => T): void {
        this.factories.set(token, factory);
    }
    
    get<T>(token: symbol | string): T {
        if (!this.singletons.has(token)) {
            const factory = this.factories.get(token);
            if (!factory) {
                throw new Error(`Service not registered: ${token.toString()}`);
            }
            this.singletons.set(token, factory());
        }
        return this.singletons.get(token);
    }
}
```

#### 2.3 Replace ContributionProvider
**New File:** `packages/core/src/common/contribution-collection.ts`
```typescript
export class ContributionCollection<T> {
    private contributions = new Set<T>();
    
    add(contribution: T): void {
        this.contributions.add(contribution);
    }
    
    getContributions(): T[] {
        return Array.from(this.contributions);
    }
}
```

### Phase 3: Class Refactoring Patterns

#### 3.1 Remove Injectable Decorator
**Pattern:**
```typescript
// Before
@injectable()
export class WorkspaceService {
    @inject(FileService) protected readonly fileService: FileService;
}

// After
export class WorkspaceService {
    constructor(
        protected readonly fileService: FileService
    ) {}
}
```

#### 3.2 Replace Constructor Injection with Direct Parameters
**Pattern:**
```typescript
// Before
@injectable()
export class MyService {
    @inject(Dependency1) protected readonly dep1: Dependency1;
    @inject(Dependency2) protected readonly dep2: Dependency2;
}

// After
export class MyService {
    constructor(
        protected readonly dep1: Dependency1,
        protected readonly dep2: Dependency2
    ) {}
}
```

#### 3.3 Replace PostConstruct with Explicit Initialization
**Pattern:**
```typescript
// Before
@injectable()
export class MyService {
    @postConstruct()
    protected init(): void {
        this.doInit();
    }
}

// After
export class MyService {
    constructor(deps: Dependencies) {
        // Initialize immediately or provide init() method
        this.doInit();
    }
    
    // Or explicit initialization
    static create(deps: Dependencies): MyService {
        const instance = new MyService(deps);
        instance.init();
        return instance;
    }
}
```

#### 3.4 Replace Named Bindings
**Pattern:**
```typescript
// Before
@inject(ContributionProvider) @named(Symbol)
protected readonly contributions: ContributionProvider<Contribution>;

// After
export class MyService {
    constructor(
        private readonly contributionCollection: ContributionCollection<Contribution>
    ) {}
    
    getContributions(): Contribution[] {
        return this.contributionCollection.getContributions();
    }
}
```

### Phase 4: Module Refactoring

#### 4.1 Convert ContainerModule to Initialization Function
**Pattern:**
```typescript
// Before: workspace-frontend-module.ts
export default new ContainerModule((bind) => {
    bind(WorkspaceService).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(WorkspaceService);
});

// After: workspace-frontend-module.ts
import { ServiceRegistry } from '@theia/core/lib/common/service-registry';
import { WorkspaceService } from './workspace-service';
import { FileService } from '@theia/filesystem/lib/browser/file-service.js';
// ... other imports

export function initializeWorkspaceFrontendModule(registry: ServiceRegistry): void {
    // Register dependencies first
    registry.registerSingleton(FileService, () => {
        // Get from registry or create
        return registry.get(FileService);
    });
    
    // Register service
    registry.registerSingleton(WorkspaceService, () => {
        const fileService = registry.get(FileService);
        const workspaceServer = registry.get(WorkspaceServer);
        // ... get all dependencies
        return new WorkspaceService(
            fileService,
            workspaceServer,
            // ... pass all dependencies
        );
    });
    
    // Register as contribution
    registry.registerSingleton(FrontendApplicationContribution, () => 
        registry.get(WorkspaceService)
    );
}
```

#### 4.2 Handle Dynamic Bindings
**Pattern:**
```typescript
// Before
bind(WorkspaceServer).toDynamicValue(ctx => {
    const provider = ctx.container.get(WebSocketConnectionProvider);
    return provider.createProxy<WorkspaceServer>(workspacePath);
});

// After
registry.registerSingleton(WorkspaceServer, () => {
    const provider = registry.get(WebSocketConnectionProvider);
    return provider.createProxy<WorkspaceServer>(workspacePath);
});
```

#### 4.3 Handle Factory Bindings
**Pattern:**
```typescript
// Before
bind(OpenFileDialogFactory).toFactory(ctx =>
    (props: OpenFileDialogProps) =>
        createOpenFileDialogContainer(ctx.container, props).get(OpenFileDialog)
);

// After
export function createOpenFileDialogFactory(registry: ServiceRegistry): OpenFileDialogFactory {
    return (props: OpenFileDialogProps) => {
        // Create dialog with dependencies from registry
        const dependencies = {
            fileService: registry.get(FileService),
            // ... other dependencies
        };
        return new OpenFileDialog(props, dependencies);
    };
}

registry.registerSingleton(OpenFileDialogFactory, () => 
    createOpenFileDialogFactory(registry)
);
```

### Phase 5: Testing Refactoring

#### 5.1 Update Test Containers
**Pattern:**
```typescript
// Before
const container = new Container();
container.bind(Service).toConstantValue(mockService);
const instance = container.get(Service);

// After
const registry = new ServiceRegistry();
registry.registerSingleton(Service, () => mockService);
const instance = registry.get(Service);
```

### Phase 6: Package-by-Package Migration

#### Migration Order (Dependency Graph Based)
1. **Core Package** (`@theia/core`)
   - Most fundamental, other packages depend on it
   - Replace ContainerModule infrastructure
   - Create ServiceRegistry and ContributionCollection
   - Update all core services

2. **Filesystem Package** (`@theia/filesystem`)
   - Depends on core
   - Update all filesystem services

3. **Workspace Package** (`@theia/workspace`)
   - Depends on core and filesystem
   - Good example for other packages

4. **Remaining Packages**
   - Follow dependency order
   - Each package can be migrated independently once dependencies are done

### Phase 7: Static Analysis Improvements

#### 7.1 Use Explicit Imports
- Replace all `container.get()` with direct imports
- Use ES module `import` statements
- Make dependencies explicit in constructor signatures

#### 7.2 Type Safety
- Ensure all dependencies are typed
- Use TypeScript interfaces for all service contracts
- Remove any `any` types introduced by inversify

#### 7.3 Tree Shaking
- Ensure unused code can be eliminated
- Use named exports instead of default exports where possible
- Avoid circular dependencies

## Implementation Steps

### Step 1: Create Core Infrastructure (Week 1)
1. Create `ServiceRegistry` class
2. Create `ContributionCollection` class
3. Create initialization utilities
4. Update core package to use new infrastructure

### Step 0: Setup Migration Tools (Before Step 1)
1. Install ts-morph: `npm install --save-dev ts-morph tsx`
2. Use migration scripts:
   - `scripts/migrate-inversify-tsmorph.ts` - Main migration tool for classes
   - `scripts/migrate-module-bindings.ts` - Module binding converter
3. Run migrations incrementally with `--dry-run` first

### Step 2: Migrate Core Package (Week 2-3)
1. Remove inversify from core package.json
2. Update all core services
3. Update all core modules
4. Update tests

### Step 3: Migrate Dependent Packages (Week 4-8)
1. Migrate filesystem package
2. Migrate workspace package (as reference)
3. Migrate remaining packages in dependency order
4. Update all tests

### Step 4: Cleanup (Week 9)
1. Remove inversify from all package.json files
2. Remove `@theia/core/shared/inversify` re-exports
3. Update documentation
4. Run full test suite

## File Structure Changes

### New Files
- `packages/core/src/common/service-registry.ts`
- `packages/core/src/common/contribution-collection.ts`
- `packages/core/src/common/module-initializer.ts`

### Modified Files
- All `*-module.ts` files → `*-module.ts` (initialization functions)
- All service classes (remove decorators, update constructors)
- All test files (update test setup)

## Breaking Changes

### API Changes
1. **Module Export Format**
   - Before: `export default new ContainerModule(...)`
   - After: `export function initializeModule(registry: ServiceRegistry): void`

2. **Service Instantiation**
   - Before: `container.get(Service)`
   - After: `registry.get(Service)` or direct instantiation

3. **Contribution Pattern**
   - Before: `ContributionProvider<T>`
   - After: `ContributionCollection<T>`

### Migration Guide for Consumers
1. Replace `container.get()` with `registry.get()`
2. Update module imports to use initialization functions
3. Update service constructors to accept dependencies directly
4. Remove all inversify decorators

## Testing Strategy

### Unit Tests
- Update all test files to use ServiceRegistry instead of Container
- Mock dependencies explicitly
- Test initialization functions

### Integration Tests
- Ensure module initialization works correctly
- Verify singleton behavior
- Test contribution collection

### E2E Tests
- Run full application tests
- Verify no functionality is broken

## Risk Mitigation

### Risks
1. **Circular Dependencies**: May be exposed when removing DI
   - **Mitigation**: Refactor to break cycles, use lazy initialization

2. **Singleton Behavior**: May break if not handled correctly
   - **Mitigation**: Use ServiceRegistry singleton pattern

3. **Initialization Order**: Services may initialize in wrong order
   - **Mitigation**: Explicit dependency declaration, topological sort

4. **Test Complexity**: Tests may become more verbose
   - **Mitigation**: Create test utilities for common patterns

## Success Criteria

1. ✅ No inversify imports in codebase
2. ✅ All code uses ES modules
3. ✅ All dependencies are statically analyzable
4. ✅ All tests pass
5. ✅ No runtime errors
6. ✅ Bundle size reduction (tree shaking works better)
7. ✅ Improved type safety

## Timeline Estimate

- **Phase 1-2**: 2 weeks (Infrastructure)
- **Phase 3-4**: 4 weeks (Core migration)
- **Phase 5-6**: 6 weeks (Package migration)
- **Phase 7**: 1 week (Cleanup)
- **Total**: ~13 weeks (3 months)

## Notes

- This is a large refactoring that should be done incrementally
- Each package can be migrated independently once core is done
- **Use ts-morph-based migration scripts** for automated transformations:
  - `scripts/migrate-inversify-tsmorph.ts` - Handles class decorators and properties
  - `scripts/migrate-module-bindings.ts` - Converts ContainerModule to initialization functions
- Keep old code commented during migration for reference
- Use feature flags if needed to support gradual rollout
- Always review automated changes manually - ts-morph handles AST transformations but dependency resolution needs human review
