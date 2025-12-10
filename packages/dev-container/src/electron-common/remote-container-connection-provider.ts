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

import { RpcServer } from '@theia/core';
import { ContainerOutputProvider } from './container-output-provider.js';
import type { ContainerInspectInfo } from 'dockerode';

// *****************************************************************************
export const RemoteContainerConnectionProviderPath = '/remote/container';

export const RemoteContainerConnectionProvider = Symbol('RemoteContainerConnectionProvider');

export type ContainerConnectionOptions = {
    nodeDownloadTemplate?: string;
    lastContainerInfo?: LastContainerInfo
    devcontainerFile: string;
    workspacePath?: string;
}

export type LastContainerInfo = {
    id: string;
    lastUsed: number;
}

export type ContainerConnectionResult = {
    port: string;
    workspacePath: string;
    containerId: string;
}

export type DevContainerFile = {
    name: string;
    path: string;
}

export type RemoteContainerConnectionProvider = RpcServer<ContainerOutputProvider> & {
    connectToContainer(options: ContainerConnectionOptions): Promise<ContainerConnectionResult>;
    getDevContainerFiles(workspacePath: string): Promise<DevContainerFile[]>;
    getCurrentContainerInfo(port: number): Promise<ContainerInspectInfo | undefined>;
}
