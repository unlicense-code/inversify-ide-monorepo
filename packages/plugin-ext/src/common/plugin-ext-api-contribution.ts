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
import { RPCProtocol } from './rpc-protocol.js';
import { PluginManager, Plugin } from './plugin-api-rpc.js';
import { interfaces } from 'inversify';

export const ExtPluginApiProvider = 'extPluginApi';
export type ExtPluginApiProvider = {
    /**
     * Provide API description.
     */
    provideApi(): ExtPluginApi;
}

export type ExtPluginBackendApiProvider = {
    /**
     * Provide API description.
     */
    provideApi(): ExtPluginBackendApi;
}

export type ExtPluginFrontendApiProvider = {
    /**
     * Provide API description.
     */
    provideApi(): ExtPluginFrontendApi;
}

export type ExtPluginBackendApi = {

    /**
     * Path to the script which should be loaded to provide api, module should export `provideApi` function with
     * [ExtPluginApiBackendInitializationFn](#ExtPluginApiBackendInitializationFn) signature
     */
    backendInitPath?: string;
}

export type ExtPluginFrontendApi = {

    /**
     * Initialization information for frontend part of Plugin API
     */
    frontendExtApi?: FrontendExtPluginApi;
}

export type ExtPluginApi = ExtPluginBackendApi & ExtPluginFrontendApi & { }

export type ExtPluginApiFrontendInitializationFn = {
    (rpc: RPCProtocol, plugins: Map<string, Plugin>): void;
}

export type ExtPluginApiBackendInitializationFn = {
    (rpc: RPCProtocol, pluginManager: PluginManager): void;
}

export type FrontendExtPluginApi = {
    /**
     * path to js file
     */
    initPath: string;
    /** global variable name */
    initVariable: string;
    /**
     * init function name,
     * function should have  [ExtPluginApiFrontendInitializationFn](#ExtPluginApiFrontendInitializationFn)
     */
    initFunction: string;
}

export const MainPluginApiProvider = Symbol('mainPluginApi');

export type MainPluginApiProvider = {
    initialize(rpc: RPCProtocol, container: interfaces.Container): void;
}
