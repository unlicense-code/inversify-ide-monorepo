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

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Some entities copied and modified from https://github.com/Microsoft/vscode/blob/master/src/vs/vscode.d.ts
// Some entities copied and modified from https://github.com/Microsoft/vscode/blob/master/src/vs/workbench/parts/debug/common/debug.ts

import { DebugConfiguration } from './debug-configuration.js';
import { IJSONSchema, IJSONSchemaSnippet } from '@theia/core/lib/common/json-schema.js';
import { MaybePromise } from '@theia/core/lib/common/types.js';
import { Event } from '@theia/core';
import { DebugChannel } from './debug-service.js';

// FIXME: break down this file to debug adapter and debug adapter contribution (see Theia file naming conventions)

/**
 * DebugAdapterSession symbol for DI.
 */
export const DebugAdapterSession = Symbol('DebugAdapterSession');

export type DebugAdapterSession = {
    id: string;
    parentSession?: DebugAdapterSession;
    start(channel: DebugChannel): Promise<void>
    stop(): Promise<void>
}

/**
 * DebugAdapterSessionFactory symbol for DI.
 */
export const DebugAdapterSessionFactory = Symbol('DebugAdapterSessionFactory');

export type DebugAdapterSessionFactory = {
    get(sessionId: string, debugAdapter: DebugAdapter): DebugAdapterSession;
}

export type DebugAdapterSpawnExecutable = {
    command: string;
    args?: string[];
}

export type DebugAdapterForkExecutable = {
    modulePath: string;
    execArgv?: string[];
    args?: string[];
}

/**
 * Debug adapter executable.
 * Parameters to instantiate the debug adapter.
 *
 * In case of launching adapter the parameters contain a command and arguments. For instance:
 * {'command' : 'COMMAND_TO_LAUNCH_DEBUG_ADAPTER', args : [ { 'arg1', 'arg2' } ] }
 *
 * In case of forking the node process, contain the modulePath to fork. For instance:
 * {'modulePath' : 'NODE_COMMAND_TO_LAUNCH_DEBUG_ADAPTER', args : [ { 'arg1', 'arg2' } ] }
 */
export type DebugAdapterExecutable = DebugAdapterSpawnExecutable | DebugAdapterForkExecutable;

export type DebugAdapter = {
    /**
     * A DAP protocol message has been received from the debug adapter
     */
    onMessageReceived: Event<string>;
    /**
     * Send a DAP message to the debug adapter
     * @param message the JSON-encoded DAP message
     */
    send(message: string): void;
    /**
     * An error has occurred communicating with the debug adapter. This does not meant the debug adapter
     * has terminated.
     */
    onError: Event<Error>;
    /**
     * The connection to the debug adapter has been lost. This signals the end of life for this
     * debug adapter instance.
     */
    onClose: Event<void>;
    /**
     * Terminate the connection to the debug adapter.
     */
    stop(): Promise<void>;
}

/**
 * DebugAdapterFactory symbol for DI.
 */
export const DebugAdapterFactory = Symbol('DebugAdapterFactory');

export type DebugAdapterFactory = {
    start(executable: DebugAdapterExecutable): DebugAdapter;
    connect(debugServerPort: number): DebugAdapter;
}

/**
 * DebugAdapterContribution symbol for DI.
 */
export const DebugAdapterContribution = Symbol('DebugAdapterContribution');

export type DebugAdapterContribution = {
    /**
     * The debug type. Should be a unique value among all debug adapters.
     */
    readonly type: string;

    readonly label?: MaybePromise<string | undefined>;

    readonly languages?: MaybePromise<string[] | undefined>;

    /**
     * The [debug adapter session](#DebugAdapterSession) factory.
     * If a default implementation of the debug adapter session does not
     * fit all needs it is possible to provide its own implementation using
     * this factory. But it is strongly recommended to extend the default
     * implementation if so.
     */
    debugAdapterSessionFactory?: DebugAdapterSessionFactory;

    /**
     * @returns The contributed configuration schema for this debug type.
     */
    getSchemaAttributes?(): MaybePromise<IJSONSchema[]>;

    getConfigurationSnippets?(): MaybePromise<IJSONSchemaSnippet[]>;

    /**
     * Provides a [debug adapter executable](#DebugAdapterExecutable)
     * based on [debug configuration](#DebugConfiguration) to launch a new debug adapter
     * or to connect to existed one.
     * @param config The resolved [debug configuration](#DebugConfiguration).
     * @returns The [debug adapter executable](#DebugAdapterExecutable).
     */
    provideDebugAdapterExecutable?(config: DebugConfiguration): MaybePromise<DebugAdapterExecutable | undefined>;

    /**
     * Provides initial [debug configuration](#DebugConfiguration).
     * @returns An array of [debug configurations](#DebugConfiguration).
     */
    provideDebugConfigurations?(workspaceFolderUri?: string): MaybePromise<DebugConfiguration[]>;

    /**
     * Resolves a [debug configuration](#DebugConfiguration) by filling in missing values
     * or by adding/changing/removing attributes before variable substitution.
     * @param config The [debug configuration](#DebugConfiguration) to resolve.
     * @returns The resolved debug configuration.
     */
    resolveDebugConfiguration?(config: DebugConfiguration, workspaceFolderUri?: string): MaybePromise<DebugConfiguration | undefined>;

    /**
     * Resolves a [debug configuration](#DebugConfiguration) by filling in missing values
     * or by adding/changing/removing attributes with substituted variables.
     * @param config The [debug configuration](#DebugConfiguration) to resolve.
     * @returns The resolved debug configuration.
     */
    resolveDebugConfigurationWithSubstitutedVariables?(config: DebugConfiguration, workspaceFolderUri?: string): MaybePromise<DebugConfiguration | undefined>;
}
