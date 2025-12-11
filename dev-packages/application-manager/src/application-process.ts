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
import fsExtra from 'fs-extra';
const fs = fsExtra;
import * as cp from 'child_process';
import { ApplicationPackage } from '@theia/application-package';

export class ApplicationProcess {

    protected getDefaultOptions(): cp.SpawnOptions {
        const env = { ...process.env };
        // Increase Node.js heap size for webpack builds to prevent out-of-memory errors
        // Only set if not already configured
        if (!env.NODE_OPTIONS || !env.NODE_OPTIONS.includes('max-old-space-size')) {
            const existingOptions = env.NODE_OPTIONS ? `${env.NODE_OPTIONS} ` : '';
            env.NODE_OPTIONS = `${existingOptions}--max-old-space-size=12288`;
            this.pck.log(`[ApplicationProcess] Setting NODE_OPTIONS: ${env.NODE_OPTIONS}`);
        } else {
            this.pck.log(`[ApplicationProcess] Using existing NODE_OPTIONS: ${env.NODE_OPTIONS}`);
        }
        const options = {
            cwd: this.pck.projectPath,
            env
        };
        this.pck.log(`[ApplicationProcess] Working directory: ${options.cwd}`);
        return options;
    }

    constructor(
        protected readonly pck: ApplicationPackage,
        protected readonly binProjectPath: string
    ) {
        this.pck.log(`[ApplicationProcess] Initialized with binProjectPath: ${binProjectPath}`);
    }

    spawn(command: string, args?: string[], options?: cp.SpawnOptions): cp.ChildProcess {
        const fullCommand = `${command} ${(args || []).join(' ')}`.trim();
        this.pck.log(`[ApplicationProcess] Spawning: ${fullCommand}`);
        const mergedOptions = Object.assign({}, this.getDefaultOptions(), {
            ...options,
            shell: true
        });
        if (mergedOptions.env?.NODE_OPTIONS) {
            this.pck.log(`[ApplicationProcess] Environment NODE_OPTIONS: ${mergedOptions.env.NODE_OPTIONS}`);
        }
        return cp.spawn(command, args || [], mergedOptions);
    }

    fork(modulePath: string, args?: string[], options?: cp.ForkOptions): cp.ChildProcess {
        const fullCommand = `node ${modulePath} ${(args || []).join(' ')}`.trim();
        this.pck.log(`[ApplicationProcess] Forking: ${fullCommand}`);
        const mergedOptions = Object.assign({}, this.getDefaultOptions(), options);
        if (mergedOptions.env?.NODE_OPTIONS) {
            this.pck.log(`[ApplicationProcess] Environment NODE_OPTIONS: ${mergedOptions.env.NODE_OPTIONS}`);
        }
        return cp.fork(modulePath, args, mergedOptions);
    }

    canRun(command: string): boolean {
        const binPath = this.resolveBin(this.binProjectPath, command);
        const result = !!binPath && fs.existsSync(binPath);
        this.pck.log(`[ApplicationProcess] canRun('${command}') = ${result}${binPath ? ` (${binPath})` : ''}`);
        return result;
    }

    run(command: string, args: string[], options?: cp.SpawnOptions): Promise<void> {
        const startTime = Date.now();
        const fullCommand = `${command} ${args.join(' ')}`.trim();
        this.pck.log(`[ApplicationProcess] Starting command: ${fullCommand}`);
        const commandProcess = this.spawnBin(command, args, options);
        return this.promisify(command, commandProcess, startTime);
    }

    spawnBin(command: string, args: string[], options?: cp.SpawnOptions): cp.ChildProcess {
        const binPath = this.resolveBin(this.binProjectPath, command);
        if (!binPath) {
            const error = `Could not resolve ${command} relative to ${this.binProjectPath}`;
            this.pck.error(`[ApplicationProcess] ${error}`);
            throw new Error(error);
        }
        this.pck.log(`[ApplicationProcess] Resolved binary: ${command} -> ${binPath}`);
        const fullCommand = `${binPath} ${(args || []).join(' ')}`.trim();
        this.pck.log(`[ApplicationProcess] Executing: ${fullCommand}`);
        return this.spawn(binPath, args, {
            ...options,
            shell: true
        });
    }

    protected resolveBin(rootPath: string, command: string): string | undefined {
        let commandPath = path.resolve(rootPath, 'node_modules', '.bin', command);
        if (process.platform === 'win32') {
            commandPath = commandPath + '.cmd';
        }
        if (fs.existsSync(commandPath)) {
            return commandPath;
        }
        const parentDir = path.dirname(rootPath);
        if (parentDir === rootPath) {
            return undefined;
        }
        return this.resolveBin(parentDir, command);
    }

    protected promisify(command: string, p: cp.ChildProcess, startTime: number): Promise<void> {
        return new Promise((resolve, reject) => {
            p.stdout!.on('data', data => this.pck.log(data.toString()));
            p.stderr!.on('data', data => this.pck.error(data.toString()));
            p.on('error', (error) => {
                const duration = Date.now() - startTime;
                this.pck.error(`[ApplicationProcess] Command '${command}' failed after ${duration}ms: ${error.message}`);
                reject(error);
            });
            p.on('close', (code, signal) => {
                const duration = Date.now() - startTime;
                if (signal) {
                    const error = `${command} exited with an unexpected signal: ${signal}.`;
                    this.pck.error(`[ApplicationProcess] ${error} (duration: ${duration}ms)`);
                    reject(new Error(error));
                    return;
                }
                if (code === 0) {
                    this.pck.log(`[ApplicationProcess] Command '${command}' completed successfully (duration: ${duration}ms)`);
                    resolve();
                } else {
                    const error = `${command} exited with an unexpected code: ${code}.`;
                    this.pck.error(`[ApplicationProcess] ${error} (duration: ${duration}ms)`);
                    reject(new Error(error));
                }
            });
        });
    }

}
