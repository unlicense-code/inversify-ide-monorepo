// *****************************************************************************
// Copyright (C) 2024 EclipseSource and others.
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

import { PluginManager } from '@theia/plugin-ext';
import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol.js';
import type { ExtPluginApi as BaseExtPluginApi } from '@theia/plugin-ext/lib/common/plugin-ext-api-contribution.js';

// Re-export everything from @theia/plugin-ext
export * from '@theia/plugin-ext';

// Extend ExtPluginApi type with headless support
export type ExtPluginApi = BaseExtPluginApi & {
    headlessInitPath?: string;
};

export type ExtPluginHeadlessApiProvider = {
    /**
     * Provide API description.
     */
    provideApi(): ExtPluginHeadlessApi;
}

export type ExtPluginHeadlessApi = {
    /**
     * Path to the script which should be loaded to provide api, module should export `provideApi` function with
     * [ExtPluginApiBackendInitializationFn](#ExtPluginApiBackendInitializationFn) signature
     */
    headlessInitPath?: string;
}

export type ExtPluginApiHeadlessInitializationFn = {
    (rpc: RPCProtocol, pluginManager: PluginManager): void;
}
