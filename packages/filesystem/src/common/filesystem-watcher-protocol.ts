// *****************************************************************************
// Copyright (C) 2026 AwesomeOS and Contributors
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

import { RpcServer } from '@theia/core';
import { FileChangeType } from './files.js';
export { FileChangeType };

export const FileSystemWatcherService = Symbol('FileSystemWatcherServer2');
export type FileSystemWatcherService = RpcServer<FileSystemWatcherServiceClient> & {
    /**
     * @param clientId arbitrary id used to identify a client.
     * @param uri the path to watch.
     * @param options optional parameters.
     * @returns promise to a unique `number` handle for this request.
     */
    watchFileChanges(clientId: number, uri: string, options?: WatchOptions): Promise<number>;
    /**
     * @param watcherId handle mapping to a previous `watchFileChanges` request.
     */
    unwatchFileChanges(watcherId: number): Promise<void>;
}

export type FileSystemWatcherServiceClient = {
    /** Listen for change events emitted by the watcher. */
    onDidFilesChanged(event: DidFilesChangedParams): void;
    /** The watcher can crash in certain conditions. */
    onError(event: FileSystemWatcherErrorParams): void;
}

export type DidFilesChangedParams = {
    /** Clients to route the events to. */
    clients?: number[];
    /** FileSystem changes that occurred. */
    changes: FileChange[];
}

export type FileSystemWatcherErrorParams = {
    /** Clients to route the events to. */
    clients: number[];
    /** The uri that originated the error. */
    uri: string;
}

export const FileSystemWatcherServer = Symbol('FileSystemWatcherServer');
export type FileSystemWatcherServer = RpcServer<FileSystemWatcherClient> & {
    /**
     * Start file watching for the given param.
     * Resolve when watching is started.
     * Return a watcher id.
     */
    watchFileChanges(uri: string, options?: WatchOptions): Promise<number>;

    /**
     * Stop file watching for the given id.
     * Resolve when watching is stopped.
     */
    unwatchFileChanges(watcherId: number): Promise<void>;
}

export type FileSystemWatcherClient = {
    /**
     * Notify when files under watched uris are changed.
     */
    onDidFilesChanged(event: DidFilesChangedParams): void;

    /**
     * Notify when unable to watch files because of Linux handle limit.
     */
    onError(): void;
}

export type WatchOptions = {
    ignored: string[];
}
export type FileChange = {
    uri: string;
    type: FileChangeType;
}
