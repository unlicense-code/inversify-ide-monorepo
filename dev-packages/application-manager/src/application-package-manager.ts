// *****************************************************************************
// Copyright (C) 2017 TypeFox and others.
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

import * as path from 'path';
import * as fs from 'fs-extra';
import * as cp from 'child_process';
import * as semver from 'semver';
import { ApplicationPackage, ApplicationPackageOptions } from '@theia/application-package';
import { WebpackGenerator, FrontendGenerator, BackendGenerator } from './generator';
import { ApplicationProcess } from './application-process';
import { GeneratorOptions } from './generator/abstract-generator';
import yargs = require('yargs');
import { RollupGenerator } from './generator/rollup-generator';

// Declare missing exports from `@types/semver@7`
declare module 'semver' {
    function minVersion(range: string): string;
}

class AbortError extends Error {
    constructor(...args: Parameters<ErrorConstructor>) {
        super(...args);
        Object.setPrototypeOf(this, AbortError.prototype);
    }
}

export class ApplicationPackageManager {

    static defineGeneratorOptions<T>(cli: yargs.Argv<T>): yargs.Argv<T & {
        mode: 'development' | 'production'
        splitFrontend?: boolean
    }> {
        return cli
            .option('mode', {
                description: 'Generation mode to use',
                choices: ['development', 'production'],
                default: 'production' as const,
            })
            .option('split-frontend', {
                description: 'Split frontend modules into separate chunks. By default enabled in the `development` mode and disabled in the `production` mode.',
                type: 'boolean'
            });
    }

    readonly pck: ApplicationPackage;
    /** application process */
    readonly process: ApplicationProcess;
    /** manager process */
    protected readonly __process: ApplicationProcess;

    constructor(options: ApplicationPackageOptions) {
        this.pck = new ApplicationPackage(options);
        this.process = new ApplicationProcess(this.pck, options.projectPath);
        this.__process = new ApplicationProcess(this.pck, path.join(__dirname, '..'));
    }

    protected async remove(fsPath: string): Promise<void> {
        if (await fs.pathExists(fsPath)) {
            await fs.remove(fsPath);
        }
    }

    async clean(): Promise<void> {
        const webpackGenerator = new WebpackGenerator(this.pck);
        await Promise.all([
            this.remove(this.pck.lib()),
            this.remove(this.pck.srcGen()),
            this.remove(webpackGenerator.genConfigPath),
            this.remove(webpackGenerator.genNodeConfigPath)
        ]);
    }

    async prepare(): Promise<void> {
        if (this.pck.isElectron()) {
            await this.prepareElectron();
        }
    }

    async generate(options: GeneratorOptions = {}): Promise<void> {
        try {
            await this.prepare();
        } catch (error) {
            if (error instanceof AbortError) {
                console.warn(error.message);
                process.exit(1);
            }
            throw error;
        }
        await Promise.all([
            new RollupGenerator(this.pck, options).generate(),
            new BackendGenerator(this.pck, options).generate(),
            new FrontendGenerator(this.pck, options).generate(),
        ]);
    }

    async copy(): Promise<void> {
        await fs.ensureDir(this.pck.lib('frontend'));
        await fs.copy(this.pck.frontend('index.html'), this.pck.lib('frontend', 'index.html'));
    }

    async build(args: string[] = [], options: GeneratorOptions = {}): Promise<void> {
        await this.generate(options);
        await this.copy();
        
        // Use rollup instead of webpack for better memory efficiency
        const rollupConfigPath = this.pck.path('rollup.config.js');
        if (await fs.pathExists(rollupConfigPath)) {
            this.pck.log(`[ApplicationPackageManager] Building rollup configs sequentially to reduce memory usage...`);
            return this.buildRollupConfigsSequentially(rollupConfigPath, args);
        } else {
            // Fallback to webpack if rollup config doesn't exist
            const webpackConfigPath = this.pck.path('webpack.config.js');
            if (await fs.pathExists(webpackConfigPath)) {
                this.pck.log(`[ApplicationPackageManager] Building webpack configs sequentially to reduce memory usage...`);
                return this.buildWebpackConfigsSequentially(webpackConfigPath, args);
            } else {
                throw new Error('No rollup or webpack config found');
            }
        }
    }

    /**
     * Build rollup configs sequentially instead of all at once to reduce memory usage.
     * Rollup is more memory-efficient than webpack and prevents out-of-memory errors.
     */
    protected async buildRollupConfigsSequentially(rollupConfigPath: string, args: string[]): Promise<void> {
        // NOTE: NODE_OPTIONS must be set BEFORE Node.js starts (e.g., in package.json scripts or shell)
        // Setting it here won't change the heap limit of the current process
        // To use 12GB heap, run: NODE_OPTIONS="--max-old-space-size=12288 --expose-gc" npm run build:browser
        const currentHeapLimit = this.getCurrentHeapLimit();
        this.pck.log(`[ApplicationPackageManager] Current heap limit: ${currentHeapLimit} MB`);
        if (currentHeapLimit < 8000) {
            this.pck.log(`[ApplicationPackageManager] WARNING: Heap limit is ${currentHeapLimit} MB. Consider running with:`);
            this.pck.log(`[ApplicationPackageManager]   NODE_OPTIONS="--max-old-space-size=12288 --expose-gc" npm run build:browser`);
        }
        
        // Try to enable GC if available
        if (!global.gc && process.env.NODE_OPTIONS && process.env.NODE_OPTIONS.includes('expose-gc')) {
            this.pck.log(`[ApplicationPackageManager] --expose-gc is in NODE_OPTIONS but GC not available. Process may need restart.`);
        }
        
        const rollup = require('rollup');
        const configs = require(rollupConfigPath);
        
        // Handle both array and single config exports
        const configArray = Array.isArray(configs) ? configs : [configs];
        
        this.pck.log(`[ApplicationPackageManager] Found ${configArray.length} rollup config(s) to build`);
        
        for (let i = 0; i < configArray.length; i++) {
            const config = configArray[i];
            const configName = typeof config.input === 'string' ? config.input : `config-${i + 1}`;
            this.pck.log(`[ApplicationPackageManager] Building rollup config ${i + 1}/${configArray.length}: ${configName}`);
            
            try {
                // Rollup config structure: { input, output, plugins, ... }
                const buildStartTime = Date.now();
                this.pck.log(`[ApplicationPackageManager] Starting rollup.rollup() for config ${i + 1}...`);
                this.pck.log(`[ApplicationPackageManager] Input: ${config.input}`);
                this.pck.log(`[ApplicationPackageManager] Plugins: ${config.plugins?.length || 0}`);
                this.pck.log(`[ApplicationPackageManager] External modules: ${Array.isArray(config.external) ? config.external.length : 'function'}`);
                
                // Track GC before build
                if (global.gc) {
                    global.gc();
                }
                
                let bundle: any;
                try {
                    bundle = await rollup.rollup({
                        input: config.input,
                        plugins: this.wrapPluginsWithLogging(config.plugins, i + 1),
                        external: config.external,
                        onwarn: config.onwarn,
                        onLog: (level: string, log: { message: string | string[]; loc: { file: any; line: any; column: any; }; }) => {
                            if (level === 'warn' || level === 'error') {
                                this.pck.log(`[Rollup ${i + 1}] ${level.toUpperCase()}: ${log.message || log}`);
                                if (log.loc) {
                                    this.pck.log(`[Rollup ${i + 1}]   at ${log.loc.file}:${log.loc.line}:${log.loc.column}`);
                                }
                            } else if (level === 'info') {
                                // Log info messages that might indicate memory usage
                                if (log.message && (log.message.includes('chunk') || log.message.includes('module'))) {
                                    this.pck.log(`[Rollup ${i + 1}] INFO: ${log.message}`);
                                }
                            }
                        },
                        // Add performance hooks
                        perf: true
                    });
                    
                    // Log bundle information
                    if (bundle && typeof bundle.getModuleIds === 'function') {
                        try {
                            const moduleIds = bundle.getModuleIds();
                            this.pck.log(`[ApplicationPackageManager] Bundle contains ${moduleIds.length} modules`);
                            if (moduleIds.length > 0) {
                                const sampleModules = Array.from(moduleIds).slice(0, 10);
                                this.pck.log(`[ApplicationPackageManager] Sample modules: ${sampleModules.join(', ')}`);
                            }
                        } catch (e) {
                            // Ignore if getModuleIds not available
                        }
                    }
                } catch (error) {
                    throw error;
                }
                
                const buildDuration = Date.now() - buildStartTime;
                this.pck.log(`[ApplicationPackageManager] rollup.rollup() completed in ${buildDuration}ms`);
                
                // Handle both single output and array of outputs
                const outputs = Array.isArray(config.output) ? config.output : [config.output];
                this.pck.log(`[ApplicationPackageManager] Writing ${outputs.length} output(s) for config ${i + 1}...`);
                
                for (let j = 0; j < outputs.length; j++) {
                    const writeStartTime = Date.now();
                    const output = outputs[j];
                    const outputFile = typeof output === 'object' && output.file ? output.file : 
                                      typeof output === 'object' && output.dir ? output.dir : 
                                      'unknown';
                    this.pck.log(`[ApplicationPackageManager] Writing output ${j + 1}/${outputs.length} to ${outputFile}...`);
                    
                    // Run GC before writing if available
                    if (global.gc && j === 0) {
                        global.gc();
                    }

                    if (bundle && typeof bundle.write === 'function') {
                        await bundle.write(output);
                        const writeDuration = Date.now() - writeStartTime;
                        this.pck.log(`[ApplicationPackageManager] Output ${j + 1} written in ${writeDuration}ms`);
                    } else {
                        throw new Error('Rollup bundle is not defined or does not have a write method');
                    }
                    // Check output file size if it exists
                    try {
                        const fs = require('fs');
                        if (fs.existsSync(outputFile)) {
                            const stats = fs.statSync(outputFile);
                            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
                            this.pck.log(`[ApplicationPackageManager] Output file size: ${sizeMB} MB`);
                        }
                    } catch (e) {
                        // Ignore file size check errors
                    }
                }
                
                this.pck.log(`[ApplicationPackageManager] Closing bundle for config ${i + 1}...`);
                await bundle.close();
                
                const totalDuration = Date.now() - buildStartTime;
                this.pck.log(`[ApplicationPackageManager] Rollup config ${i + 1}/${configArray.length} completed successfully in ${totalDuration}ms`);
            } catch (error) {
                this.pck.error(`[ApplicationPackageManager] Rollup config ${i + 1}/${configArray.length} failed: ${error instanceof Error ? error.message : String(error)}`);
                if (error instanceof Error && error.stack) {
                    this.pck.error(`[ApplicationPackageManager] Stack trace: ${error.stack}`);
                }
                throw error;
            }
        }
        
        this.pck.log(`[ApplicationPackageManager] All rollup configs built successfully`);
    }

    /**
     * Get current heap limit in MB
     */
    protected getCurrentHeapLimit(): number {
        try {
            const v8 = require('v8');
            const heapStats = v8.getHeapStatistics();
            return Math.round(heapStats.heap_size_limit / 1024 / 1024);
        } catch (e) {
            return 0;
        }
    }


    /**
     * Wrap rollup plugins with logging to track what's being processed
     */
    protected wrapPluginsWithLogging(plugins: any[], configIndex: number): any[] {
        return plugins.map((plugin, index) => {
            if (!plugin || typeof plugin !== 'object') {
                return plugin;
            }
            
            // Create a wrapper object to avoid mutating the original plugin
            const wrappedPlugin: any = { ...plugin };
            
            // Wrap buildStart hook
            const originalBuildStart = plugin.buildStart;
            if (originalBuildStart) {
                wrappedPlugin.buildStart = async function(options: any) {
                    if (typeof originalBuildStart === 'function') {
                        return originalBuildStart.call(this, options);
                    }
                };
            }

            // Wrap resolveId hook
            const originalResolveId = plugin.resolveId;
            if (originalResolveId) {
                wrappedPlugin.resolveId = async function(id: string, importer: string | undefined) {
                    if (typeof originalResolveId === 'function') {
                        return originalResolveId.call(this, id, importer);
                    }
                };
            }

            // Wrap load hook
            const originalLoad = plugin.load;
            if (originalLoad) {
                wrappedPlugin.load = async function(id: string) {
                    const result = typeof originalLoad === 'function' ? await originalLoad.call(this, id) : undefined;
                    return result;
                };
            }

            // Wrap transform hook
            const originalTransform = plugin.transform;
            if (originalTransform) {
                wrappedPlugin.transform = async function(code: string, id: string) {
                    if (typeof originalTransform === 'function') {
                        return originalTransform.call(this, code, id);
                    }
                };
            }

            return wrappedPlugin;
        });
    }

    /**
     * Build webpack configs sequentially instead of all at once to reduce memory usage.
     * This prevents out-of-memory errors when building large applications.
     */
    protected async buildWebpackConfigsSequentially(webpackConfigPath: string, args: string[]): Promise<void> {
        const webpack = require('webpack');
        const configs = require(webpackConfigPath);
        
        // Handle both array and single config exports
        const configArray = Array.isArray(configs) ? configs : [configs];
        
        this.pck.log(`[ApplicationPackageManager] Found ${configArray.length} webpack config(s) to build`);
        
        for (let i = 0; i < configArray.length; i++) {
            const config = configArray[i];
            const configName = config.name || `config-${i + 1}`;
            this.pck.log(`[ApplicationPackageManager] Building webpack config ${i + 1}/${configArray.length}: ${configName}`);
            
            await new Promise<void>((resolve, reject) => {
                const compiler = webpack(config);
                compiler.run((err: Error | null, stats: any) => {
                    if (err) {
                        this.pck.error(`[ApplicationPackageManager] Webpack config ${configName} failed: ${err.message}`);
                        reject(err);
                        return;
                    }
                    if (stats?.hasErrors()) {
                        const errors = stats.compilation.errors.map((e: any) => e.message || e.toString()).join('\n');
                        this.pck.error(`[ApplicationPackageManager] Webpack config ${configName} compilation errors:\n${errors}`);
                        reject(new Error(`Webpack compilation failed for ${configName}`));
                        return;
                    }
                    if (stats?.hasWarnings()) {
                        const warnings = stats.compilation.warnings.map((w: any) => w.message || w.toString()).join('\n');
                        this.pck.log(`[ApplicationPackageManager] Webpack config ${configName} warnings:\n${warnings}`);
                    }
                    this.pck.log(`[ApplicationPackageManager] Webpack config ${configName} completed successfully`);
                    resolve();
                });
            });
        }
        
        this.pck.log(`[ApplicationPackageManager] All webpack configs built successfully`);
    }

    start(args: string[] = []): cp.ChildProcess {
        if (this.pck.isElectron()) {
            return this.startElectron(args);
        } else if (this.pck.isBrowserOnly()) {
            return this.startBrowserOnly(args);
        }
        return this.startBrowser(args);
    }

    startBrowserOnly(args: string[]): cp.ChildProcess {
        const { command, mainArgs, options } = this.adjustBrowserOnlyArgs(args);
        return this.__process.spawnBin(command, mainArgs, options);
    }

    adjustBrowserOnlyArgs(args: string[]): Readonly<{ command: string, mainArgs: string[]; options: cp.SpawnOptions }> {
        let { mainArgs, options } = this.adjustArgs(args);

        // first parameter: path to generated frontend
        // second parameter: disable cache to support watching
        mainArgs = ['lib/frontend', '-c-1', ...mainArgs];

        const portIndex = mainArgs.findIndex(v => v.startsWith('--port'));
        if (portIndex === -1) {
            mainArgs.push('--port=3000');
        }

        return { command: 'http-server', mainArgs, options };
    }

    startElectron(args: string[]): cp.ChildProcess {
        // If possible, pass the project root directory to electron rather than the script file so that Electron
        // can determine the app name. This requires that the package.json has a main field.
        let appPath = this.pck.projectPath;

        if (!this.pck.pck.main) {
            // Try the bundled electron app first
            appPath = this.pck.lib('backend', 'electron-main.js');
            if (!fs.existsSync(appPath)) {
                // Fallback to the generated electron app in src-gen
                appPath = this.pck.backend('electron-main.js');
            }

            console.warn(
                `WARNING: ${this.pck.packagePath} does not have a "main" entry.\n` +
                'Please add the following line:\n' +
                '    "main": "lib/backend/electron-main.js"'
            );
        }

        const { mainArgs, options } = this.adjustArgs([appPath, ...args]);
        const electronCli = require.resolve('electron/cli.js', { paths: [this.pck.projectPath] });
        return this.__process.fork(electronCli, mainArgs, options);
    }

    startBrowser(args: string[]): cp.ChildProcess {
        const { mainArgs, options } = this.adjustArgs(args);
        // The backend must be a process group leader on UNIX in order to kill the tree later.
        // See https://nodejs.org/api/child_process.html#child_process_options_detached
        options.detached = process.platform !== 'win32';
        // Try the bundled backend app first
        let mainPath = this.pck.lib('backend', 'main.js');
        if (!fs.existsSync(mainPath)) {
            // Fallback to the generated backend file in src-gen
            mainPath = this.pck.backend('main.js');
        }
        return this.__process.fork(mainPath, mainArgs, options);
    }

    /**
     * Inject Theia's Electron-specific dependencies into the application's package.json.
     *
     * Only overwrite the Electron range if the current minimum supported version is lower than the recommended one.
     */
    protected async prepareElectron(): Promise<void> {
        let theiaElectron;
        try {
            theiaElectron = await import('@theia/electron');
        } catch (error) {
            if (error.code === 'ERR_MODULE_NOT_FOUND') {
                throw new AbortError('Please install @theia/electron as part of your Theia Electron application');
            }
            throw error;
        }
        const expectedRange = theiaElectron.electronRange;
        const appPackageJsonPath = this.pck.path('package.json');
        const appPackageJson = await fs.readJSON(appPackageJsonPath) as { devDependencies?: Record<string, string> };
        if (!appPackageJson.devDependencies) {
            appPackageJson.devDependencies = {};
        }
        const currentRange: string | undefined = appPackageJson.devDependencies.electron;
        if (!currentRange || semver.compare(semver.minVersion(currentRange), semver.minVersion(expectedRange)) < 0) {
            // Update the range with the recommended one and write it on disk.
            appPackageJson.devDependencies = this.insertAlphabetically(appPackageJson.devDependencies, 'electron', expectedRange);
            await fs.writeJSON(appPackageJsonPath, appPackageJson, { spaces: 2 });
            throw new AbortError('Updated dependencies, please run "install" again');
        }
        if (!theiaElectron.electronVersion || !semver.satisfies(theiaElectron.electronVersion, currentRange)) {
            throw new AbortError('Dependencies are out of sync, please run "install" again');
        }
        const ffmpeg = await import('@theia/ffmpeg');
        await ffmpeg.replaceFfmpeg();
        await ffmpeg.checkFfmpeg();
    }

    protected insertAlphabetically<T extends Record<string, string>>(object: T, key: string, value: string): T {
        const updated: Record<string, unknown> = {};
        for (const property of Object.keys(object)) {
            if (property.localeCompare(key) > 0) {
                updated[key] = value;
            }
            updated[property] = object[property];
        }
        if (!(key in updated)) {
            updated[key] = value;
        }
        return updated as T;
    }

    private adjustArgs(args: string[], forkOptions: cp.ForkOptions = {}): Readonly<{ mainArgs: string[]; options: cp.ForkOptions }> {
        const options = {
            ...this.forkOptions,
            forkOptions
        };
        const mainArgs = [...args];
        const inspectIndex = mainArgs.findIndex(v => v.startsWith('--inspect'));
        if (inspectIndex !== -1) {
            const inspectArg = mainArgs.splice(inspectIndex, 1)[0];
            options.execArgv = ['--nolazy', inspectArg];
        }
        return {
            mainArgs,
            options
        };
    }

    private get forkOptions(): cp.ForkOptions {
        return {
            stdio: [0, 1, 2, 'ipc'],
            env: {
                ...process.env,
                THEIA_PARENT_PID: String(process.pid)
            }
        };
    }
}
