// *****************************************************************************
// Copyright (C) 2018 Red Hat, Inc. and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
import { RpcServer } from '@theia/core/lib/common/messaging/proxy-factory.js';
import { RPCProtocol } from './rpc-protocol.js';
import { Disposable } from '@theia/core/lib/common/disposable.js';
import { LogPart, KeysToAnyValues, KeysToKeysToAnyValue } from './types.js';
import { CharacterPair, CommentRule, PluginAPIFactory, Plugin, ThemeIcon } from './plugin-api-rpc.js';
import { ExtPluginApi } from './plugin-ext-api-contribution.js';
import { IJSONSchema, IJSONSchemaSnippet } from '@theia/core/lib/common/json-schema.js';
import { ProblemMatcherContribution, ProblemPatternContribution, TaskDefinition } from '@theia/task/lib/common/index.js';
import { ColorDefinition } from '@theia/core/lib/common/color.js';
import { ResourceLabelFormatter } from '@theia/core/lib/common/label-protocol.js';
import { PluginIdentifiers } from './plugin-identifiers.js';
import { JSONObject } from '@lumino/coreutils';
import { PreferenceSchema } from '@theia/core';

export { PluginIdentifiers };
export const hostedServicePath = '/services/hostedPlugin';

/**
 * Plugin engine (API) type, i.e. 'theiaPlugin', 'vscode', 'theiaHeadlessPlugin', etc.
 */
export type PluginEngine = string;

export type PluginPackage = {
    name: string;
    // The publisher is not guaranteed to be defined for unpublished plugins. https://github.com/microsoft/vscode-vsce/commit/a38657ece04c20e4fbde15d5ac1ed39ca51cb856
    publisher: string | undefined;
    version: string;
    engines: {
        [type in PluginEngine]: string;
    };
    theiaPlugin?: {
        frontend?: string;
        backend?: string;
        /* Requires the `@theia/plugin-ext-headless` extension. */
        headless?: string;
    };
    main?: string;
    browser?: string;
    displayName: string;
    description: string;
    contributes?: PluginPackageContribution;
    packagePath: string;
    activationEvents?: string[];
    extensionDependencies?: string[];
    extensionPack?: string[];
    l10n?: string;
    icon?: string;
    extensionKind?: Array<'ui' | 'workspace'>
}
export namespace PluginPackage {
    export function toPluginUrl(pck: PluginPackage | PluginModel, relativePath: string): string {
        return `hostedPlugin/${getPluginId(pck)}/${encodeURIComponent(relativePath)}`;
    }
}

export type PluginPackageContribution = {
    authentication?: PluginPackageAuthenticationProvider[];
    configuration?: JSONObject | JSONObject[];
    configurationDefaults?: JSONObject;
    languages?: PluginPackageLanguageContribution[];
    grammars?: PluginPackageGrammarsContribution[];
    customEditors?: PluginPackageCustomEditor[];
    viewsContainers?: { [location: string]: PluginPackageViewContainer[] };
    views?: { [location: string]: PluginPackageView[] };
    viewsWelcome?: PluginPackageViewWelcome[];
    commands?: PluginPackageCommand | PluginPackageCommand[];
    menus?: { [location: string]: PluginPackageMenu[] };
    submenus?: PluginPackageSubmenu[];
    keybindings?: PluginPackageKeybinding | PluginPackageKeybinding[];
    debuggers?: PluginPackageDebuggersContribution[];
    snippets?: PluginPackageSnippetsContribution[];
    themes?: PluginThemeContribution[];
    iconThemes?: PluginIconThemeContribution[];
    icons?: PluginIconContribution[];
    colors?: PluginColorContribution[];
    taskDefinitions?: PluginTaskDefinitionContribution[];
    problemMatchers?: PluginProblemMatcherContribution[];
    problemPatterns?: PluginProblemPatternContribution[];
    jsonValidation?: PluginJsonValidationContribution[];
    resourceLabelFormatters?: ResourceLabelFormatter[];
    localizations?: PluginPackageLocalization[];
    terminal?: PluginPackageTerminal;
    notebooks?: PluginPackageNotebook[];
    notebookRenderer?: PluginNotebookRendererContribution[];
    notebookPreload?: PluginPackageNotebookPreload[];
    mcpServerDefinitionProviders?: PluginPackageMcpServerDefinitionProviderContribution[];
}

export type PluginPackageNotebook = {
    type: string;
    displayName: string;
    selector?: readonly { filenamePattern?: string; excludeFileNamePattern?: string }[];
    priority?: string;
}

export type PluginNotebookRendererContribution = {
    readonly id: string;
    readonly displayName: string;
    readonly mimeTypes: string[];
    readonly entrypoint: string | { readonly extends: string; readonly path: string };
    readonly requiresMessaging?: 'always' | 'optional' | 'never'
}

export type PluginPackageNotebookPreload = {
    type: string;
    entrypoint: string;
}

export type PluginPackageMcpServerDefinitionProviderContribution = {
    id: string;
    label: string;
    description?: string;
}

export type PluginPackageAuthenticationProvider = {
    id: string;
    label: string;
}

export type PluginPackageTerminalProfile = {
    title: string;
    id: string;
    icon?: string;
}

export type PluginPackageTerminal = {
    profiles: PluginPackageTerminalProfile[];
}

export type PluginPackageLocalization = {
    languageId: string;
    languageName?: string;
    localizedLanguageName?: string;
    translations: PluginPackageTranslation[];
    minimalTranslations?: { [key: string]: string };
}

export type PluginPackageTranslation = {
    id: string;
    path: string;
}

export type PluginPackageCustomEditor = {
    viewType: string;
    displayName: string;
    selector?: CustomEditorSelector[];
    priority?: CustomEditorPriority;
}

export type CustomEditorSelector = {
    readonly filenamePattern?: string;
}

export enum CustomEditorPriority {
    default = 'default',
    builtin = 'builtin',
    option = 'option',
}

export type PluginPackageViewContainer = {
    id: string;
    title: string;
    icon: string;
}

export enum PluginViewType {
    Tree = 'tree',
    Webview = 'webview'
}

export type PluginPackageView = {
    id: string;
    name: string;
    when?: string;
    type?: string;
}

export type PluginPackageViewWelcome = {
    view: string;
    contents: string;
    when?: string;
    enablement?: string;
}

export type PluginPackageCommand = {
    command: string;
    title: string;
    shortTitle?: string;
    original?: string;
    category?: string;
    icon?: string | { light: string; dark: string; };
    enablement?: string;
}

export type PluginPackageMenu = {
    command?: string;
    submenu?: string;
    alt?: string;
    group?: string;
    when?: string;
}

export type PluginPackageSubmenu = {
    id: string;
    label: string;
    icon: IconUrl;
}

export type PluginPackageKeybinding = {
    key?: string;
    command: string;
    when?: string;
    mac?: string;
    linux?: string;
    win?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args?: any;
}

export type PluginPackageGrammarsContribution = {
    language?: string;
    scopeName: string;
    path: string;
    embeddedLanguages?: ScopeMap;
    tokenTypes?: ScopeMap;
    injectTo?: string[];
}

export type ScopeMap = {
    [scopeName: string]: string;
}

export type PluginPackageSnippetsContribution = {
    language?: string;
    path?: string;
}

export type PluginColorContribution = {
    id?: string;
    description?: string;
    defaults?: { light?: string, dark?: string, highContrast?: string };
}

export type PluginUiTheme = 'vs' | 'vs-dark' | 'hc-black';

export type PluginThemeContribution = {
    id?: string;
    label?: string;
    description?: string;
    path?: string;
    uiTheme?: PluginUiTheme;
}

export type PluginIconThemeContribution = {
    id?: string;
    label?: string;
    description?: string;
    path?: string;
    uiTheme?: PluginUiTheme;
}

export type PluginIconContribution = {
    [id: string]: {
        description: string;
        default: { fontPath: string; fontCharacter: string } | string;
    };
}

export type PlatformSpecificAdapterContribution = {
    program?: string;
    args?: string[];
    runtime?: string;
    runtimeArgs?: string[];
}

export type PluginPackageDebuggersContribution = PlatformSpecificAdapterContribution & {
    type: string;
    label?: string;
    languages?: string[];
    enableBreakpointsFor?: { languageIds: string[] };
    configurationAttributes: { [request: string]: IJSONSchema };
    configurationSnippets: IJSONSchemaSnippet[];
    variables?: ScopeMap;
    adapterExecutableCommand?: string;
    win?: PlatformSpecificAdapterContribution;
    winx86?: PlatformSpecificAdapterContribution;
    windows?: PlatformSpecificAdapterContribution;
    osx?: PlatformSpecificAdapterContribution;
    linux?: PlatformSpecificAdapterContribution;
}

export type PluginPackageLanguageContribution = {
    id: string;
    extensions?: string[];
    filenames?: string[];
    filenamePatterns?: string[];
    firstLine?: string;
    aliases?: string[];
    mimetypes?: string[];
    configuration?: string;
    icon?: IconUrl;
}

export type PluginPackageLanguageContributionConfiguration = {
    comments?: CommentRule;
    brackets?: CharacterPair[];
    autoClosingPairs?: (CharacterPair | AutoClosingPairConditional)[];
    surroundingPairs?: (CharacterPair | AutoClosingPair)[];
    wordPattern?: string;
    indentationRules?: IndentationRules;
    folding?: FoldingRules;
    onEnterRules?: OnEnterRule[];
}

export type PluginTaskDefinitionContribution = {
    type: string;
    required: string[];
    properties?: IJSONSchema['properties'];
}

export type PluginProblemMatcherContribution = ProblemMatcherContribution & {
    name: string;
}

export type PluginProblemPatternContribution = ProblemPatternContribution & {
    name: string;
}

export type PluginJsonValidationContribution = {
    fileMatch: string | string[];
    url: string;
}

export const PluginScanner = Symbol('PluginScanner');
export type PluginScanner = {
    /**
     * The type of plugin's API (engine name)
     */
    apiType: PluginEngine;

    /**
     * Creates plugin's model.
     *
     * @param {PluginPackage} plugin
     * @returns {PluginModel}
     */
    getModel(plugin: PluginPackage): PluginModel;

    /**
     * Creates plugin's lifecycle.
     *
     * @returns {PluginLifecycle}
     */
    getLifecycle(plugin: PluginPackage): PluginLifecycle;

    getContribution(plugin: PluginPackage): Promise<PluginContribution | undefined>;

    /**
     * A mapping between a dependency as its defined in package.json
     * and its deployable form, e.g. `publisher.name` -> `vscode:extension/publisher.name`
     */
    getDependencies(plugin: PluginPackage): Map<string, string> | undefined;
}

/**
 * A plugin resolver is handling how to resolve a plugin link into a local resource.
 */
export const PluginDeployerResolver = Symbol('PluginDeployerResolver');
export type PluginDeployerResolver = {

    init?(pluginDeployerResolverInit: PluginDeployerResolverInit): void;

    accept(pluginSourceId: string): boolean;

    resolve(pluginResolverContext: PluginDeployerResolverContext, options?: PluginDeployOptions): Promise<void>;

}

export const PluginDeployerDirectoryHandler = Symbol('PluginDeployerDirectoryHandler');
export type PluginDeployerDirectoryHandler = {
    accept(pluginDeployerEntry: PluginDeployerEntry): Promise<boolean>;

    handle(context: PluginDeployerDirectoryHandlerContext): Promise<void>;
}

export const PluginDeployerFileHandler = Symbol('PluginDeployerFileHandler');
export type PluginDeployerFileHandler = {

    accept(pluginDeployerEntry: PluginDeployerEntry): Promise<boolean>;

    handle(context: PluginDeployerFileHandlerContext): Promise<void>;
}

export type PluginDeployerResolverInit = {

}

export type PluginDeployerResolverContext = {

    addPlugin(pluginId: string, path: string): void;

    getPlugins(): PluginDeployerEntry[];

    getOriginId(): string;

}

export type PluginDeployerStartContext = {
    readonly userEntries: string[]
    readonly systemEntries: string[]
}

export const PluginDeployer = Symbol('PluginDeployer');
export type PluginDeployer = {

    start(): Promise<void>;

}

export const PluginDeployerParticipant = Symbol('PluginDeployerParticipant');
export type PluginDeployerParticipant = {
    onWillStart?(context: PluginDeployerStartContext): Promise<void>;
}

export enum PluginDeployerEntryType {

    FRONTEND,

    BACKEND,

    HEADLESS // Deployed in the Theia Node server outside the context of a frontend/backend connection
}

/**
 * Whether a plugin installed by a user or system.
 */
export enum PluginType {
    System,
    User
};

export type UnresolvedPluginEntry = {
    id: string;
    type?: PluginType;
}

export type PluginDeployerEntry = {

    /**
     * ID (before any resolution)
     */
    id(): string;

    /**
     * Original resolved path
     */
    originalPath(): string;

    /**
     * Local path on the filesystem.
     */
    path(): string;

    /**
     * Get a specific entry
     */
    getValue<T>(key: string): T;

    /**
     * Store a value
     */
    storeValue<T>(key: string, value: T): void;

    /**
     * Update path
     */
    updatePath(newPath: string): void;

    getChanges(): string[];

    isFile(): Promise<boolean>;

    isDirectory(): Promise<boolean>;

    /**
     * Resolved if a resolver has handle this plugin
     */
    isResolved(): boolean;

    resolvedBy(): string;

    /**
     * Accepted when a handler is telling this location can go live
     */
    isAccepted(...types: PluginDeployerEntryType[]): boolean;

    accept(...types: PluginDeployerEntryType[]): void;

    hasError(): boolean;

    type: PluginType
    /**
     * A fs path to a directory where a plugin is located.
     * Depending on a plugin format it can be different from `path`.
     * Use `path` if you want to resolve something within a plugin, like `README.md` file.
     * Use `rootPath` if you want to manipulate the entire plugin location, like delete or move it.
     */
    rootPath: string
}

export type PluginDeployerFileHandlerContext = {

    unzip(sourcePath: string, destPath: string): Promise<void>;

    pluginEntry(): PluginDeployerEntry;

}

export type PluginDeployerDirectoryHandlerContext = {

    copy(origin: string, target: string): Promise<void>;

    pluginEntry(): PluginDeployerEntry;

}

export type PluginModel = {
    id: string;
    name: string;
    publisher: string;
    version: string;
    displayName: string;
    description: string;
    engine: {
        type: PluginEngine;
        version: string;
    };
    entryPoint: PluginEntryPoint;
    packageUri: string;
    /**
     * @deprecated since 1.1.0 - because it lead to problems with getting a relative path
     * needed by Icon Themes to correctly load Fonts, use packageUri instead.
     */
    packagePath: string;
    iconUrl?: string;
    l10n?: string;
    readmeUrl?: string;
    licenseUrl?: string;
}

export type PluginEntryPoint = {
    frontend?: string;
    backend?: string;
    headless?: string;
}

export type PluginContribution = {
    activationEvents?: string[];
    authentication?: AuthenticationProviderInformation[];
    configuration?: PreferenceSchema[];
    configurationDefaults?: JSONObject;
    languages?: LanguageContribution[];
    grammars?: GrammarsContribution[];
    customEditors?: CustomEditor[];
    viewsContainers?: { [location: string]: ViewContainer[] };
    views?: { [location: string]: View[] };
    viewsWelcome?: ViewWelcome[];
    commands?: PluginCommand[];
    menus?: { [location: string]: Menu[] };
    submenus?: Submenu[];
    keybindings?: Keybinding[];
    debuggers?: DebuggerContribution[];
    snippets?: SnippetContribution[];
    themes?: ThemeContribution[];
    iconThemes?: IconThemeContribution[];
    icons?: IconContribution[];
    colors?: ColorDefinition[];
    taskDefinitions?: TaskDefinition[];
    problemMatchers?: ProblemMatcherContribution[];
    problemPatterns?: ProblemPatternContribution[];
    resourceLabelFormatters?: ResourceLabelFormatter[];
    localizations?: Localization[];
    terminalProfiles?: TerminalProfile[];
    notebooks?: NotebookContribution[];
    notebookRenderer?: NotebookRendererContribution[];
    notebookPreload?: notebookPreloadContribution[];
}
export type NotebookContribution = {
    type: string;
    displayName: string;
    selector?: readonly { filenamePattern?: string; excludeFileNamePattern?: string }[];
    priority?: string;
}

export type NotebookRendererContribution = {
    readonly id: string;
    readonly displayName: string;
    readonly mimeTypes: string[];
    readonly entrypoint: string | { readonly extends: string; readonly path: string };
    readonly requiresMessaging?: 'always' | 'optional' | 'never'
}

export type notebookPreloadContribution = {
    type: string;
    entrypoint: string;
}

export type AuthenticationProviderInformation = {
    id: string;
    label: string;
}

export type TerminalProfile = {
    title: string,
    id: string,
    icon?: string
}

export type Localization = {
    languageId: string;
    languageName?: string;
    localizedLanguageName?: string;
    translations: Translation[];
    minimalTranslations?: { [key: string]: string };
}

export type Translation = {
    id: string;
    path: string;
    cachedContents?: { [scope: string]: { [key: string]: string } };
}

export type SnippetContribution = {
    uri: string
    source: string
    language?: string
}

export type UiTheme = 'vs' | 'vs-dark' | 'hc-black';

export type ThemeContribution = {
    id?: string;
    label?: string;
    description?: string;
    uri: string;
    uiTheme?: UiTheme;
}

export type IconThemeContribution = {
    id: string;
    label?: string;
    description?: string;
    uri: string;
    uiTheme?: UiTheme;
}

export type IconDefinition = {
    fontCharacter: string;
    location: string;
}

export type IconDefaults = ThemeIcon | IconDefinition;

export type IconContribution = {
    id: string;
    extensionId: string;
    description: string | undefined;
    defaults: IconDefaults;
}

export namespace IconContribution {
    export function isIconDefinition(defaults: IconDefaults): defaults is IconDefinition {
        return 'fontCharacter' in defaults;
    }
}

export type GrammarsContribution = {
    format: 'json' | 'plist';
    language?: string;
    scope: string;
    grammar?: string | object;
    grammarLocation?: string;
    embeddedLanguages?: ScopeMap;
    tokenTypes?: ScopeMap;
    injectTo?: string[];
    balancedBracketScopes?: string[];
    unbalancedBracketScopes?: string[];
}

export type LanguageContribution = {
    id: string;
    extensions?: string[];
    filenames?: string[];
    filenamePatterns?: string[];
    firstLine?: string;
    aliases?: string[];
    mimetypes?: string[];
    configuration?: LanguageConfiguration;
    /**
     * @internal
     */
    icon?: IconUrl;
}

export type RegExpOptions = {
    pattern: string;
    flags?: string;
}

export type LanguageConfiguration = {
    brackets?: CharacterPair[];
    indentationRules?: IndentationRules;
    surroundingPairs?: AutoClosingPair[];
    autoClosingPairs?: AutoClosingPairConditional[];
    comments?: CommentRule;
    folding?: FoldingRules;
    wordPattern?: string | RegExpOptions;
    onEnterRules?: OnEnterRule[];
}

export type DebuggerContribution = PlatformSpecificAdapterContribution & {
    type: string,
    label?: string,
    languages?: string[],
    enableBreakpointsFor?: {
        languageIds: string[]
    },
    configurationAttributes?: {
        [request: string]: IJSONSchema
    },
    configurationSnippets?: IJSONSchemaSnippet[],
    variables?: ScopeMap,
    adapterExecutableCommand?: string
    win?: PlatformSpecificAdapterContribution;
    winx86?: PlatformSpecificAdapterContribution;
    windows?: PlatformSpecificAdapterContribution;
    osx?: PlatformSpecificAdapterContribution;
    linux?: PlatformSpecificAdapterContribution;
}

export type IndentationRules = {
    increaseIndentPattern: string | RegExpOptions;
    decreaseIndentPattern: string | RegExpOptions;
    unIndentedLinePattern?: string | RegExpOptions;
    indentNextLinePattern?: string | RegExpOptions;
}
export type AutoClosingPair = {
    close: string;
    open: string;
}

export type AutoClosingPairConditional = AutoClosingPair & {
    notIn?: string[];
}

export type FoldingMarkers = {
    start: string | RegExpOptions;
    end: string | RegExpOptions;
}

export type FoldingRules = {
    offSide?: boolean;
    markers?: FoldingMarkers;
}

export type OnEnterRule = {
    beforeText: string | RegExpOptions;
    afterText?: string | RegExpOptions;
    previousLineText?: string | RegExpOptions;
    action: EnterAction;
}

export type EnterAction = {
    indent: 'none' | 'indent' | 'outdent' | 'indentOutdent';
    appendText?: string;
    removeText?: number;
}

export type CustomEditor = {
    viewType: string;
    displayName: string;
    selector: CustomEditorSelector[];
    priority: CustomEditorPriority;
}

export type ViewContainer = {
    id: string;
    title: string;
    iconUrl: string;
    themeIcon?: string;
}

export type View = {
    id: string;
    name: string;
    when?: string;
    type?: string;
}

export type ViewWelcome = {
    view: string;
    content: string;
    when?: string;
    enablement?: string;
    order: number;
}

export type PluginCommand = {
    command: string;
    title: string;
    shortTitle?: string;
    originalTitle?: string;
    category?: string;
    iconUrl?: IconUrl;
    themeIcon?: string;
    enablement?: string;
}

export type IconUrl = string | { light: string; dark: string; };

export type Menu = {
    command?: string;
    submenu?: string
    alt?: string;
    group?: string;
    when?: string;
}

export type Submenu = {
    id: string;
    label: string;
    icon?: IconUrl;
}

export type Keybinding = {
    keybinding?: string;
    command: string;
    when?: string;
    mac?: string;
    linux?: string;
    win?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args?: any;
}

export type PluginLifecycle = {
    startMethod: string;
    stopMethod: string;
    /**
     * Frontend module name, frontend plugin should expose this name.
     */
    frontendModuleName?: string;
    /**
     * Path to the script which should do some initialization before frontend plugin is loaded.
     */
    frontendInitPath?: string;
    /**
     * Path to the script which should do some initialization before backend plugin is loaded.
     */
    backendInitPath?: string;
}

export type BackendInitializationFn = {
    (apiFactory: PluginAPIFactory, plugin: Plugin): void;
}

export type BackendLoadingFn = {
    (rpc: RPCProtocol, plugin: Plugin): void;
}

export type PluginContext = {
    subscriptions: Disposable[];
}

export type ExtensionContext = {
    subscriptions: Disposable[];
}

export type PluginMetadata = {
    host: string;
    model: PluginModel;
    lifecycle: PluginLifecycle;
    isUnderDevelopment?: boolean;
    outOfSync: boolean;
}

export const MetadataProcessor = Symbol('MetadataProcessor');
export type MetadataProcessor = {
    process(pluginMetadata: PluginMetadata): void;
}

export function getPluginId(plugin: PluginPackage | PluginModel): string {
    return `${plugin.publisher}_${plugin.name}`.replace(/\W/g, '_');
}

export function buildFrontendModuleName(plugin: PluginPackage | PluginModel): string {
    return `${plugin.publisher}_${plugin.name}`.replace(/\W/g, '_');
}

export const HostedPluginClient = Symbol('HostedPluginClient');
export type HostedPluginClient = {
    postMessage(pluginHost: string, buffer: Uint8Array): Promise<void>;

    log(logPart: LogPart): void;

    onDidDeploy(): void;
}

export type PluginDependencies = {
    metadata: PluginMetadata
    /**
     * Actual listing of plugin dependencies.
     * Mapping from {@link PluginIdentifiers.UnversionedId external representation} of plugin identity to a string
     * that can be used to identify the resolver for the specific plugin case, e.g. with scheme `vscode://<id>`.
     */
    mapping?: Map<string, string>
}

export const PluginDeployerHandler = Symbol('PluginDeployerHandler');
export type PluginDeployerHandler = {
    deployFrontendPlugins(frontendPlugins: PluginDeployerEntry[]): Promise<number | undefined>;
    deployBackendPlugins(backendPlugins: PluginDeployerEntry[]): Promise<number | undefined>;
    getDeployedPluginIds(): Promise<readonly PluginIdentifiers.VersionedId[]>;

    getDeployedPlugins(): Promise<DeployedPlugin[]>;
    getDeployedPluginsById(pluginId: string): DeployedPlugin[];

    getDeployedPlugin(pluginId: PluginIdentifiers.VersionedId): DeployedPlugin | undefined;
    /**
     * Removes the plugin from the location it originally resided on disk.
     * Unless `--uncompressed-plugins-in-place` is passed to the CLI, this operation is safe.
     */
    uninstallPlugin(pluginId: PluginIdentifiers.VersionedId): Promise<boolean>;

    /**
     * Removes the plugin from the locations to which it had been deployed.
     * This operation is not safe - references to deleted assets may remain.
     */
    undeployPlugin(pluginId: PluginIdentifiers.VersionedId): Promise<boolean>;

    getPluginDependencies(pluginToBeInstalled: PluginDeployerEntry): Promise<PluginDependencies | undefined>;

    /**
     * Marks the given plugins as "disabled". While the plugin remains installed, it will no longer
     * be used. Has no effect if the plugin is not installed
     * @param pluginId the plugin to disable
     * @returns whether the plugin was installed, enabled and could be disabled
     */
    disablePlugin(pluginId: PluginIdentifiers.UnversionedId): Promise<boolean>;

    /**
     * Marks the given plugins as "enabled". Has no effect if the plugin is not installed.
     * @param pluginId the plugin to enabled
     * @returns whether the plugin was installed, disabled and could be enabled
     */
    enablePlugin(pluginId: PluginIdentifiers.UnversionedId): Promise<boolean>;

}

export type DeployedPlugin = {
    /**
     * defaults to system
     */
    type?: PluginType;
    metadata: PluginMetadata;
    contributes?: PluginContribution;
}

export const HostedPluginServer = Symbol('HostedPluginServer');
export type HostedPluginServer = RpcServer<HostedPluginClient> & {

    getDeployedPluginIds(): Promise<PluginIdentifiers.VersionedId[]>;

    getInstalledPluginIds(): Promise<PluginIdentifiers.VersionedId[]>;

    getUninstalledPluginIds(): Promise<readonly PluginIdentifiers.VersionedId[]>;

    getDisabledPluginIds(): Promise<readonly PluginIdentifiers.UnversionedId[]>;

    getDeployedPlugins(ids: PluginIdentifiers.VersionedId[]): Promise<DeployedPlugin[]>;

    getExtPluginAPI(): Promise<ExtPluginApi[]>;

    onMessage(targetHost: string, message: Uint8Array): Promise<void>;

}

export const PLUGIN_HOST_BACKEND = 'main';

export type WorkspaceStorageKind = {
    workspace?: string | undefined;
    roots: string[];
}
export type GlobalStorageKind = undefined;
export type PluginStorageKind = GlobalStorageKind | WorkspaceStorageKind;

export type PluginDeployOptions = {
    version: string;
    /** Instructs the deployer to ignore any existing plugins with different versions */
    ignoreOtherVersions?: boolean;
}

export const pluginServerJsonRpcPath = '/services/plugin-ext';
export const PluginServer = Symbol('PluginServer');
export type PluginServer = {

    /**
     * Deploy a plugin.
     *
     * @param type whether a plugin is installed by a system or a user, defaults to a user
     */
    install(pluginEntry: string, type?: PluginType, options?: PluginDeployOptions): Promise<void>;
    uninstall(pluginId: PluginIdentifiers.VersionedId): Promise<void>;

    enablePlugin(pluginId: PluginIdentifiers.UnversionedId): Promise<boolean>;
    disablePlugin(pluginId: PluginIdentifiers.UnversionedId): Promise<boolean>;

    getInstalledPlugins(): Promise<readonly PluginIdentifiers.VersionedId[]>;
    getUninstalledPlugins(): Promise<readonly PluginIdentifiers.VersionedId[]>;
    getDisabledPlugins(): Promise<readonly PluginIdentifiers.UnversionedId[]>;

    setStorageValue(key: string, value: KeysToAnyValues, kind: PluginStorageKind): Promise<boolean>;
    getStorageValue(key: string, kind: PluginStorageKind): Promise<KeysToAnyValues>;
    getAllStorageValues(kind: PluginStorageKind): Promise<KeysToKeysToAnyValue>;
}

export const ServerPluginRunner = Symbol('ServerPluginRunner');
export type ServerPluginRunner = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    acceptMessage(pluginHostId: string, jsonMessage: Uint8Array): boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onMessage(pluginHostId: string, jsonMessage: Uint8Array): void;
    setClient(client: HostedPluginClient): void;
    setDefault(defaultRunner: ServerPluginRunner): void;
    clientClosed(): void;
}

export const PluginHostEnvironmentVariable = Symbol('PluginHostEnvironmentVariable');
export type PluginHostEnvironmentVariable = {
    process(env: NodeJS.ProcessEnv): void;
}
