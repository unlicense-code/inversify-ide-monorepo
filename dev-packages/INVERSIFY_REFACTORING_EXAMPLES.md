# Inversify Refactoring Examples

This document provides concrete examples of how to transform code from Inversify-based dependency injection to ECMAScript modules.

## Example 1: Simple Service Class

### Before (with Inversify)

```typescript
import { injectable, inject } from 'inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service.js';
import { WorkspaceServer } from '../common';

@injectable()
export class WorkspaceService {
    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(WorkspaceServer)
    protected readonly server: WorkspaceServer;

    @postConstruct()
    protected init(): void {
        this.doInit();
    }

    protected async doInit(): Promise<void> {
        // initialization logic
    }
}
```

### After (ES Modules)

```typescript
import { FileService } from '@theia/filesystem/lib/browser/file-service.js';
import { WorkspaceServer } from '../common';

export class WorkspaceService {
    constructor(
        protected readonly fileService: FileService,
        protected readonly server: WorkspaceServer
    ) {
        // Initialize immediately or defer
        this.init();
    }

    protected init(): void {
        this.doInit();
    }

    protected async doInit(): Promise<void> {
        // initialization logic
    }
}
```

## Example 2: Module Definition

### Before (ContainerModule)

```typescript
import { ContainerModule, interfaces } from 'inversify';
import { WorkspaceService } from './workspace-service';
import { FileService } from '@theia/filesystem/lib/browser/file-service.js';
import { WorkspaceServer } from '../common';

export default new ContainerModule((bind: interfaces.Bind) => {
    bind(WorkspaceService).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(WorkspaceService);
});
```

### After (Initialization Function)

```typescript
import { ServiceRegistry } from '@theia/core/lib/common/service-registry';
import { WorkspaceService } from './workspace-service';
import { FileService } from '@theia/filesystem/lib/browser/file-service.js';
import { WorkspaceServer } from '../common';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/index.js';

export function initializeWorkspaceFrontendModule(registry: ServiceRegistry): void {
    // Register WorkspaceService as singleton
    registry.registerSingleton(WorkspaceService, () => {
        const fileService = registry.get(FileService);
        const workspaceServer = registry.get(WorkspaceServer);
        return new WorkspaceService(fileService, workspaceServer);
    });

    // Register as contribution
    registry.registerSingleton(FrontendApplicationContribution, () => 
        registry.get(WorkspaceService)
    );
}
```

## Example 3: Service with Multiple Dependencies

### Before

```typescript
import { injectable, inject, postConstruct } from 'inversify';

@injectable()
export class WorkspaceFrontendContribution implements CommandContribution {
    @inject(MessageService) protected readonly messageService: MessageService;
    @inject(FileService) protected readonly fileService: FileService;
    @inject(OpenerService) protected readonly openerService: OpenerService;
    @inject(WorkspaceService) protected readonly workspaceService: WorkspaceService;
    @inject(QuickOpenWorkspace) protected readonly quickOpenWorkspace: QuickOpenWorkspace;
    @inject(FileDialogService) protected readonly fileDialogService: FileDialogService;
    @inject(ContextKeyService) protected readonly contextKeyService: ContextKeyService;
    @inject(EncodingRegistry) protected readonly encodingRegistry: EncodingRegistry;
    @inject(PreferenceConfigurations) protected readonly preferenceConfigurations: PreferenceConfigurations;
    @inject(FilesystemSaveableService) protected readonly saveService: FilesystemSaveableService;
    @inject(WorkspaceFileService) protected readonly workspaceFileService: WorkspaceFileService;

    configure(): void {
        // configuration logic
    }
}
```

### After

```typescript
export class WorkspaceFrontendContribution implements CommandContribution {
    constructor(
        protected readonly messageService: MessageService,
        protected readonly fileService: FileService,
        protected readonly openerService: OpenerService,
        protected readonly workspaceService: WorkspaceService,
        protected readonly quickOpenWorkspace: QuickOpenWorkspace,
        protected readonly fileDialogService: FileDialogService,
        protected readonly contextKeyService: ContextKeyService,
        protected readonly encodingRegistry: EncodingRegistry,
        protected readonly preferenceConfigurations: PreferenceConfigurations,
        protected readonly saveService: FilesystemSaveableService,
        protected readonly workspaceFileService: WorkspaceFileService
    ) {}

    configure(): void {
        // configuration logic
    }
}
```

### Module Registration

```typescript
export function initializeWorkspaceFrontendModule(registry: ServiceRegistry): void {
    registry.registerSingleton(WorkspaceFrontendContribution, () => {
        return new WorkspaceFrontendContribution(
            registry.get(MessageService),
            registry.get(FileService),
            registry.get(OpenerService),
            registry.get(WorkspaceService),
            registry.get(QuickOpenWorkspace),
            registry.get(FileDialogService),
            registry.get(ContextKeyService),
            registry.get(EncodingRegistry),
            registry.get(PreferenceConfigurations),
            registry.get(FilesystemSaveableService),
            registry.get(WorkspaceFileService)
        );
    });
}
```

## Example 4: Named Bindings and ContributionProvider

### Before

```typescript
import { injectable, inject, named } from 'inversify';
import { ContributionProvider } from '@theia/core';

export const WorkspaceOpenHandlerContribution = Symbol('WorkspaceOpenHandlerContribution');

@injectable()
export class WorkspaceService {
    @inject(ContributionProvider) @named(WorkspaceOpenHandlerContribution)
    protected readonly openHandlerContribution: ContributionProvider<WorkspaceOpenHandlerContribution>;

    protected async doOpen(uri: URI): Promise<void> {
        for (const handler of [...this.openHandlerContribution.getContributions(), this]) {
            if (await handler.canHandle(uri)) {
                handler.openWorkspace(uri);
                return;
            }
        }
    }
}
```

### After

```typescript
import { ContributionCollection } from '@theia/core/lib/common/contribution-collection';

export const WorkspaceOpenHandlerContribution = Symbol('WorkspaceOpenHandlerContribution');

export interface WorkspaceOpenHandlerContribution {
    canHandle(uri: URI): Promise<boolean>;
    openWorkspace(uri: URI): Promise<void>;
}

export class WorkspaceService {
    constructor(
        private readonly openHandlerCollection: ContributionCollection<WorkspaceOpenHandlerContribution>
    ) {}

    protected async doOpen(uri: URI): Promise<void> {
        const handlers = [...this.openHandlerCollection.getContributions(), this];
        for (const handler of handlers) {
            if (await handler.canHandle(uri)) {
                handler.openWorkspace(uri);
                return;
            }
        }
    }
}
```

### Module Registration

```typescript
export function initializeWorkspaceFrontendModule(registry: ServiceRegistry): void {
    // Create contribution collection
    const openHandlerCollection = new ContributionCollection<WorkspaceOpenHandlerContribution>();
    registry.registerSingleton(WorkspaceOpenHandlerContribution, () => openHandlerCollection);

    // Register service
    registry.registerSingleton(WorkspaceService, () => {
        const collection = registry.get<ContributionCollection<WorkspaceOpenHandlerContribution>>(
            WorkspaceOpenHandlerContribution
        );
        return new WorkspaceService(collection);
    });

    // Register contributions
    registry.onServiceRegistered(WorkspaceOpenHandlerContribution, (contribution) => {
        const collection = registry.get<ContributionCollection<WorkspaceOpenHandlerContribution>>(
            WorkspaceOpenHandlerContribution
        );
        collection.add(contribution);
    });
}
```

## Example 5: Dynamic Value Binding

### Before

```typescript
export default new ContainerModule((bind) => {
    bind(WorkspaceServer).toDynamicValue(ctx => {
        const provider = ctx.container.get(WebSocketConnectionProvider);
        return provider.createProxy<WorkspaceServer>(workspacePath);
    }).inSingletonScope();
});
```

### After

```typescript
export function initializeWorkspaceFrontendModule(registry: ServiceRegistry): void {
    registry.registerSingleton(WorkspaceServer, () => {
        const provider = registry.get(WebSocketConnectionProvider);
        return provider.createProxy<WorkspaceServer>(workspacePath);
    });
}
```

## Example 6: Factory Binding

### Before

```typescript
export default new ContainerModule((bind) => {
    bind(OpenFileDialogFactory).toFactory(ctx =>
        (props: OpenFileDialogProps) =>
            createOpenFileDialogContainer(ctx.container, props).get(OpenFileDialog)
    );
});
```

### After

```typescript
export function createOpenFileDialogFactory(
    registry: ServiceRegistry
): (props: OpenFileDialogProps) => OpenFileDialog {
    return (props: OpenFileDialogProps) => {
        const fileService = registry.get(FileService);
        const labelProvider = registry.get(LabelProvider);
        // ... get other dependencies
        return new OpenFileDialog(props, {
            fileService,
            labelProvider,
            // ... other dependencies
        });
    };
}

export function initializeWorkspaceFrontendModule(registry: ServiceRegistry): void {
    registry.registerSingleton(OpenFileDialogFactory, () => 
        createOpenFileDialogFactory(registry)
    );
}
```

## Example 7: Optional Dependencies

### Before

```typescript
import { injectable, inject, optional } from 'inversify';

@injectable()
export class QuickOpenWorkspace {
    @inject(QuickInputService) @optional() 
    protected readonly quickInputService?: QuickInputService;
}
```

### After

```typescript
export class QuickOpenWorkspace {
    constructor(
        protected readonly quickInputService?: QuickInputService
    ) {}
}
```

### Module Registration

```typescript
export function initializeWorkspaceFrontendModule(registry: ServiceRegistry): void {
    registry.registerSingleton(QuickOpenWorkspace, () => {
        const quickInputService = registry.tryGet(QuickInputService);
        return new QuickOpenWorkspace(quickInputService);
    });
}
```

## Example 8: Test Setup

### Before

```typescript
import { Container } from 'inversify';

describe('WorkspaceService', () => {
    let container: Container;
    let workspaceService: WorkspaceService;

    beforeEach(() => {
        container = new Container();
        container.bind(FileService).toConstantValue(mockFileService);
        container.bind(WorkspaceServer).toConstantValue(mockWorkspaceServer);
        container.bind(WorkspaceService).toSelf().inSingletonScope();
        workspaceService = container.get(WorkspaceService);
    });
});
```

### After

```typescript
import { ServiceRegistry } from '@theia/core/lib/common/service-registry';

describe('WorkspaceService', () => {
    let registry: ServiceRegistry;
    let workspaceService: WorkspaceService;

    beforeEach(() => {
        registry = new ServiceRegistry();
        registry.registerSingleton(FileService, () => mockFileService);
        registry.registerSingleton(WorkspaceServer, () => mockWorkspaceServer);
        registry.registerSingleton(WorkspaceService, () => {
            return new WorkspaceService(
                registry.get(FileService),
                registry.get(WorkspaceServer)
            );
        });
        workspaceService = registry.get(WorkspaceService);
    });
});
```

## Example 9: Service Registry Implementation

```typescript
// packages/core/src/common/service-registry.ts

export class ServiceRegistry {
    private singletons = new Map<symbol | string | Function, any>();
    private factories = new Map<symbol | string | Function, () => any>();
    private initializing = new Set<symbol | string | Function>();

    registerSingleton<T>(
        token: symbol | string | Function,
        factory: () => T
    ): void {
        this.factories.set(token, factory);
    }

    get<T>(token: symbol | string | Function): T {
        // Check if already instantiated
        if (this.singletons.has(token)) {
            return this.singletons.get(token);
        }

        // Check for circular dependency
        if (this.initializing.has(token)) {
            throw new Error(`Circular dependency detected: ${token.toString()}`);
        }

        // Get factory
        const factory = this.factories.get(token);
        if (!factory) {
            throw new Error(`Service not registered: ${token.toString()}`);
        }

        // Create instance
        this.initializing.add(token);
        try {
            const instance = factory();
            this.singletons.set(token, instance);
            return instance;
        } finally {
            this.initializing.delete(token);
        }
    }

    tryGet<T>(token: symbol | string | Function): T | undefined {
        if (this.factories.has(token)) {
            return this.get<T>(token);
        }
        return undefined;
    }

    has(token: symbol | string | Function): boolean {
        return this.factories.has(token);
    }

    clear(): void {
        this.singletons.clear();
        this.factories.clear();
        this.initializing.clear();
    }
}
```

## Example 10: Contribution Collection Implementation

```typescript
// packages/core/src/common/contribution-collection.ts

export class ContributionCollection<T> {
    private contributions = new Set<T>();

    add(contribution: T): void {
        this.contributions.add(contribution);
    }

    remove(contribution: T): void {
        this.contributions.delete(contribution);
    }

    getContributions(): T[] {
        return Array.from(this.contributions);
    }

    has(contribution: T): boolean {
        return this.contributions.has(contribution);
    }

    clear(): void {
        this.contributions.clear();
    }
}
```

## Example 11: Application Bootstrap

### Before

```typescript
import { Container } from 'inversify';
import workspaceModule from '@theia/workspace/lib/browser/workspace-frontend-module';

const container = new Container();
container.load(workspaceModule);
const service = container.get(WorkspaceService);
```

### After

```typescript
import { ServiceRegistry } from '@theia/core/lib/common/service-registry';
import { initializeWorkspaceFrontendModule } from '@theia/workspace/lib/browser/workspace-frontend-module';

const registry = new ServiceRegistry();
initializeWorkspaceFrontendModule(registry);
const service = registry.get(WorkspaceService);
```

## Key Transformation Rules

1. **Remove all decorators**: `@injectable()`, `@inject()`, `@postConstruct()`, `@named()`, `@optional()`
2. **Convert constructor parameters**: Move `@inject()` properties to constructor parameters
3. **Replace ContainerModule**: Convert to initialization function
4. **Replace container.get()**: Use `registry.get()` or direct instantiation
5. **Handle singletons**: Use ServiceRegistry singleton pattern
6. **Replace ContributionProvider**: Use ContributionCollection
7. **Update tests**: Replace Container with ServiceRegistry
8. **Make dependencies explicit**: All dependencies in constructor signature

## Benefits

1. **Static Analysis**: All dependencies are visible in code
2. **Tree Shaking**: Unused code can be eliminated
3. **Type Safety**: Better TypeScript inference
4. **Simplicity**: No runtime magic, easier to understand
5. **Performance**: No reflection overhead
6. **Debugging**: Easier to trace dependency chains
