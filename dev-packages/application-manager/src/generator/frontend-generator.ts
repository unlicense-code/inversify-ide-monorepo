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

/* eslint-disable @typescript-eslint/indent */

import { EOL } from 'os';
import { AbstractGenerator, GeneratorOptions } from './abstract-generator';
import { existsSync, readFileSync } from 'fs';

export class FrontendGenerator extends AbstractGenerator {

    async generate(options?: GeneratorOptions): Promise<void> {
        await this.write(this.pck.frontend('index.html'), this.compileIndexHtml(this.pck.targetFrontendModules));
        await this.write(this.pck.frontend('index.js'), this.compileIndexJs(this.pck.targetFrontendModules, this.pck.targetFrontendPreloadModules));
        await this.write(this.pck.frontend('secondary-window.html'), this.compileSecondaryWindowHtml());
        await this.write(this.pck.frontend('secondary-index.js'), this.compileSecondaryIndexJs(this.pck.secondaryWindowModules));
        if (this.pck.isElectron()) {
            await this.write(this.pck.frontend('preload.js'), this.compilePreloadJs());
        }
    }

    protected compileIndexPreload(frontendModules: Map<string, string>): string {
        const template = this.pck.props.generator.config.preloadTemplate;
        if (!template) {
            return '';
        }

        // Support path to html file
        if (existsSync(template)) {
            return readFileSync(template).toString();
        }

        return template;
    }

    protected compileIndexHtml(frontendModules: Map<string, string>): string {
        return `<!DOCTYPE html>
<html lang="en">

<head>${this.compileIndexHead(frontendModules)}
</head>

<body>
    <div class="theia-preload">${this.compileIndexPreload(frontendModules)}</div>
    <script type="text/javascript" src="./bundle.js" charset="utf-8"></script>
</body>

</html>`;
    }

    protected compileIndexHead(frontendModules: Map<string, string>): string {
        return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>${this.pck.props.frontend.config.applicationName}</title>`;
    }

    protected compileIndexJs(frontendModules: Map<string, string>, frontendPreloadModules: Map<string, string>): string {
        return `\
// @ts-check
require('reflect-metadata');
const { Container } = require('@theia/core/shared/inversify');
const { ServiceRegistry } = require('@theia/core/lib/common/service-registry');
const { FrontendApplicationConfigProvider } = require('@theia/core/lib/browser/frontend-application-config-provider');

FrontendApplicationConfigProvider.set(${this.prettyStringify(this.pck.props.frontend.config)});

${this.ifMonaco(() => `
self.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
        return './editor.worker.js';
    }
}`)}

// Hybrid loader: supports both ContainerModule (old) and initialization functions (new)
function load(container, registry, jsModule) {
    return Promise.resolve(jsModule)
        .then(module => {
            // Check for initialization function exports (new format)
            // Look for functions that start with "initialize" and take one parameter (registry)
            const initKeys = Object.keys(module).filter(key => 
                key.startsWith('initialize') && typeof module[key] === 'function' && module[key].length === 1
            );
            if (initKeys.length > 0) {
                // Use the first initialization function found
                module[initKeys[0]](registry);
                return Promise.resolve();
            }
            
            // Check if module.default is a ContainerModule (old format)
            if (module.default) {
                if (typeof module.default === 'function') {
                    // Try ContainerModule first (old format)
                    try {
                        container.load(module.default);
                        return Promise.resolve();
                    } catch (e) {
                        // If container.load fails, check if it's an initialization function
                        if (module.default.length === 1) {
                            module.default(registry);
                            return Promise.resolve();
                        }
                        throw e;
                    }
                }
            }
            
            console.warn('Module does not export default ContainerModule or initialization function');
            return Promise.resolve();
        });
}

async function preload(container, registry) {
    try {
${Array.from(frontendPreloadModules.values(), jsModulePath => `\
        await load(container, registry, ${this.importOrRequire()}('${jsModulePath}'));`).join(EOL)}
        const { Preloader } = require('@theia/core/lib/browser/preload/preloader');
        // Try registry first, fallback to container
        let preloader;
        try {
            preloader = registry.get(require('@theia/core/lib/browser/preload/preloader').Preloader);
        } catch {
            preloader = container.get(require('@theia/core/lib/browser/preload/preloader').Preloader);
        }
        await preloader.initialize();
    } catch (reason) {
        console.error('Failed to run preload scripts.');
        if (reason) {
            console.error(reason);
        }
    }
}

module.exports = (async () => {
    // Create both container (for old modules) and registry (for new modules)
    const container = new Container();
    const registry = new ServiceRegistry();
    
    // Store registry in window for compatibility
    (window['theia'] = window['theia'] || {}).registry = registry;
    (window['theia'] = window['theia'] || {}).container = container;

    // Load core modules - these still use ContainerModule for now
    const { messagingFrontendModule } = require('@theia/core/lib/${this.pck.isBrowser() || this.pck.isBrowserOnly()
                ? 'browser/messaging/messaging-frontend-module'
                : 'electron-browser/messaging/electron-messaging-frontend-module'}');
    container.load(messagingFrontendModule);
    ${this.ifBrowserOnly(`const { messagingFrontendOnlyModule } = require('@theia/core/lib/browser-only/messaging/messaging-frontend-only-module');
    container.load(messagingFrontendOnlyModule);`)}

    await preload(container, registry);

    ${this.ifMonaco(() => `
    const { MonacoInit } = require('@theia/monaco/lib/browser/monaco-init');
    `)};

    const { FrontendApplication } = require('@theia/core/lib/browser');
    const { frontendApplicationModule } = require('@theia/core/lib/browser/frontend-application-module');    
    const { loggerFrontendModule } = require('@theia/core/lib/browser/logger-frontend-module');

    container.load(frontendApplicationModule);
    ${this.pck.ifBrowserOnly(`const { frontendOnlyApplicationModule } = require('@theia/core/lib/browser-only/frontend-only-application-module');
    container.load(frontendOnlyApplicationModule);`)}
    
    container.load(loggerFrontendModule);
    ${this.ifBrowserOnly(`const { loggerFrontendOnlyModule } = require('@theia/core/lib/browser-only/logger-frontend-only-module');
    container.load(loggerFrontendOnlyModule);`)}

    try {
${Array.from(frontendModules.values(), jsModulePath => `\
        await load(container, registry, ${this.importOrRequire()}('${jsModulePath}'));`).join(EOL)}
        ${this.ifMonaco(() => `
        MonacoInit.init(container);
        `)};
        await start();
    } catch (reason) {
        console.error('Failed to start the frontend application.');
        if (reason) {
            console.error(reason);
        }
    }

    function start() {
        // Try registry first, fallback to container
        let app;
        try {
            app = registry.get(FrontendApplication);
        } catch {
            app = container.get(FrontendApplication);
        }
        return app.start();
    }
})();
`;
    }

    protected importOrRequire(): string {
        return this.options.mode !== 'production' ? 'import' : 'require';
    }

    /** HTML for secondary windows that contain an extracted widget. */
    protected compileSecondaryWindowHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Theia — Secondary Window</title>
    <style>
    html, body {
        overflow: hidden;
        -ms-overflow-style: none;
    }

    body {
        margin: 0;
    }

    html,
    head,
    body,
    .secondary-widget-root,
    #widget-host {
        width: 100% !important;
        height: 100% !important;
    }
    </style>
    <link rel="stylesheet" href="./secondary-window.css">
</head>

<body>
    <div id="widget-host"></div>
</body>

</html>`;
    }

    protected compileSecondaryIndexJs(secondaryWindowModules: Map<string, string>): string {
        return `\
// @ts-check
require('reflect-metadata');
const { Container } = require('@theia/core/shared/inversify');

module.exports = Promise.resolve().then(() => {
    const { frontendApplicationModule } = require('@theia/core/lib/browser/frontend-application-module');
    const container = new Container();
    container.load(frontendApplicationModule);
${Array.from(secondaryWindowModules.values(), jsModulePath => `\
    container.load(require('${jsModulePath}').default);`).join(EOL)}
});
`;
    }

    compilePreloadJs(): string {
        return `\
// @ts-check
${Array.from(this.pck.preloadModules.values(), path => `require('${path}').preload();`).join(EOL)}
`;
    }
}
