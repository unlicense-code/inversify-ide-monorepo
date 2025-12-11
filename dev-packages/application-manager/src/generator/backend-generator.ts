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

import { EOL } from 'os';
import { AbstractGenerator } from './abstract-generator.js';

export class BackendGenerator extends AbstractGenerator {

    async generate(): Promise<void> {
        if (this.pck.isBrowserOnly()) {
            // no backend generation in case of browser-only target
            return;
        }
        const backendModules = this.pck.targetBackendModules;
        await this.write(this.pck.backend('server.js'), this.compileServer(backendModules));
        await this.write(this.pck.backend('main.js'), this.compileMain(backendModules));
        if (this.pck.isElectron()) {
            await this.write(this.pck.backend('electron-main.cjs'), this.compileElectronMain(this.pck.targetElectronMainModules));
        }
    }

    protected compileElectronMain(electronMainModules?: Map<string, string>): string {
        return `// @ts-check
// Minimal Electron wrapper - handles only Electron-specific initialization
// All application logic is in main.js (ES module) which gets loaded via dynamic import

const { resolve } = require('path');
const { app } = require('electron');

// Workaround for https://github.com/electron/electron/issues/9225. Chrome has an issue where
// in certain locales (e.g. PL), image metrics are wrongly computed. We explicitly set the
// LC_NUMERIC to prevent this from happening (selects the numeric formatting category of the
// C locale, http://en.cppreference.com/w/cpp/locale/LC_categories).
if (process.env.LC_ALL) {
    process.env.LC_ALL = 'C';
}
process.env.LC_NUMERIC = 'C';

// Useful for Electron/NW.js apps as GUI apps on macOS doesn't inherit the \`$PATH\` define
// in your dotfiles (.bashrc/.bash_profile/.zshrc/etc).
// https://github.com/electron/electron/issues/550#issuecomment-162037357
// https://github.com/eclipse-theia/theia/pull/3534#issuecomment-439689082
// Import fix-path - it's a CommonJS package, require it directly
const fixPath = require('fix-path');
if (typeof fixPath === 'function') {
    fixPath();
} else if (fixPath && typeof fixPath.default === 'function') {
    fixPath.default();
}

// Set up environment variables
const theiaAppProjectPath = resolve(__dirname, '..', '..');
process.env.THEIA_APP_PROJECT_PATH = theiaAppProjectPath;

// Handle single instance lock (Electron-specific)
const isSingleInstance = ${this.pck.props.backend.config.singleInstance === true ? 'true' : 'false'};
if (isSingleInstance && !app.requestSingleInstanceLock(process.argv)) {
    // There is another instance running, exit now. The other instance will request focus.
    app.quit();
    process.exit(0);
}

// Dynamically import the ES module main.js which contains all the application logic
(async () => {
    try {
        // Import the ES module main.js - it handles all the actual application setup
        await import('./main.js');
    } catch (reason) {
        if (typeof reason !== 'number') {
            console.error('Failed to start the electron application.');
            if (reason) {
                console.error(reason);
            }
        }
        app.quit();
        process.exit(1);
    }
})();
`;
    }

    protected compileServer(backendModules: Map<string, string>): string {
        return `// @ts-check
require('reflect-metadata');${this.ifElectron(`

// Patch electron version if missing, see https://github.com/eclipse-theia/theia/pull/7361#pullrequestreview-377065146
if (typeof process.versions.electron === 'undefined' && typeof process.env.THEIA_ELECTRON_VERSION === 'string') {
    process.versions.electron = process.env.THEIA_ELECTRON_VERSION;
}`)}

// Erase the ELECTRON_RUN_AS_NODE variable from the environment, else Electron apps started using Theia will pick it up.
if ('ELECTRON_RUN_AS_NODE' in process.env) {
    delete process.env.ELECTRON_RUN_AS_NODE;
}

const path = require('path');
process.env.THEIA_APP_PROJECT_PATH = path.resolve(__dirname, '..', '..')
const express = require('express');
const { Container } = require('inversify');
const { BackendApplication, BackendApplicationServer, CliManager } = require('@theia/core/lib/node/index.js');
const { backendApplicationModule } = require('@theia/core/lib/node/backend-application-module');
const { messagingBackendModule } = require('@theia/core/lib/node/messaging/messaging-backend-module');
const { loggerBackendModule } = require('@theia/core/lib/node/logger-backend-module');

const container = new Container();
container.load(backendApplicationModule);
container.load(messagingBackendModule);
container.load(loggerBackendModule);

function defaultServeStatic(app) {
    app.use(express.static(path.resolve(__dirname, '../../lib/frontend')))
}

function load(raw) {
    return Promise.resolve(raw).then(
        module => container.load(module.default)
    );
}

async function start(port, host, argv = process.argv) {
    if (!container.isBound(BackendApplicationServer)) {
        container.bind(BackendApplicationServer).toConstantValue({ configure: defaultServeStatic });
    }
    let result = undefined;
    await container.get(CliManager).initializeCli(argv.slice(2), 
        () => container.get(BackendApplication).configured,
        async () => {
            result = container.get(BackendApplication).start(port, host);
        });
    if (result) {
        return result;
    } else {
        return Promise.reject(0);
    }
}

module.exports = async (port, host, argv) => {
    try {
${Array.from(backendModules.values(), jsModulePath => `\
        await load(require('${jsModulePath}'));`).join(EOL)}
        return await start(port, host, argv);
    } catch (error) {
        if (typeof error !== 'number') {
            console.error('Failed to start the backend application:');
            console.error(error); 
            process.exitCode = 1;
        }
        throw error;
    }
}
`;
    }

    protected compileMain(backendModules: Map<string, string>): string {
        if (this.pck.isElectron()) {
            // For Electron, generate ES module that sets up ElectronMainApplication
            return this.compileElectronMainJs(backendModules);
        } else {
            // For browser, generate CommonJS that sets up BackendApplication
            return `// @ts-check
const { BackendApplicationConfigProvider } = require('@theia/core/lib/node/backend-application-config-provider');
const main = require('@theia/core/lib/node/main');

BackendApplicationConfigProvider.set(${this.prettyStringify(this.pck.props.backend.config)});

globalThis.extensionInfo = ${this.prettyStringify(this.pck.extensionPackages.map(({ name, version }) => ({ name, version })))};

const serverModule = require('./server');
const serverAddress = main.start(serverModule());

serverAddress.then((addressInfo) => {
    if (process && process.send && addressInfo) {
        process.send(addressInfo);
    }
});

globalThis.serverAddress = serverAddress;
`;
        }
    }

    protected compileElectronMainJs(electronMainModules?: Map<string, string>): string {
        return `// @ts-check
// ES module for Electron - sets up ElectronMainApplication
// This is imported by electron-main.cjs (minimal CommonJS wrapper)

import 'reflect-metadata';
import { BackendApplicationConfigProvider } from '@theia/core/lib/node/backend-application-config-provider.js';
import { default as electronMainApplicationModule } from '@theia/core/lib/electron-main/electron-main-application-module.js';
import { ElectronMainApplication, ElectronMainApplicationGlobals } from '@theia/core/lib/electron-main/electron-main-application.js';
import { Container } from 'inversify';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

BackendApplicationConfigProvider.set(${this.prettyStringify(this.pck.props.backend.config)});

globalThis.extensionInfo = ${this.prettyStringify(this.pck.extensionPackages.map(({ name, version }) => ({ name, version })))};

const theiaAppProjectPath = resolve(__dirname, '..', '..');
const config = ${this.prettyStringify(this.pck.props.frontend.config)};

const container = new Container();
container.load(electronMainApplicationModule);
container.bind(ElectronMainApplicationGlobals).toConstantValue({
    THEIA_APP_PROJECT_PATH: theiaAppProjectPath,
    THEIA_BACKEND_MAIN_PATH: resolve(__dirname, 'main.js'),
    THEIA_FRONTEND_HTML_PATH: resolve(__dirname, '..', 'lib', 'frontend', 'index.html'),
    THEIA_SECONDARY_WINDOW_HTML_PATH: resolve(__dirname, '..', 'lib', 'frontend', 'secondary-window.html')
});

function load(raw) {
    return Promise.resolve(raw.default).then(module =>
        container.load(module)
    );
}

async function start() {
    const application = container.get(ElectronMainApplication);
    await application.start(config);
}

try {
${Array.from(electronMainModules?.values() ?? [], jsModulePath => {
            const modulePath = jsModulePath.endsWith('.js') ? jsModulePath : jsModulePath + '.js';
            return `    await load(await import('${modulePath}'));`;
        }).join('\n')}
    await start();
} catch (reason) {
    if (typeof reason !== 'number') {
        console.error('Failed to start the electron application.');
        if (reason) {
            console.error(reason);
        }
    }
    const { app } = await import('electron');
    app.quit();
    process.exit(1);
}
`;
    }

}
