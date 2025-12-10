// *****************************************************************************
// Copyright (C) 2025 AwesomeOS and Contributors
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

export type WslDistribution = {
    name: string;
    default: boolean;
    version: string;
}

export type WslConnectionOptions = {
    nodeDownloadTemplate: string;
    distribution: string;
    workspacePath?: string;
}

export type WslConnectionResult = {
    port: number;
}

export const RemoteWslConnectionProviderPath = '/remote/wsl';

export const RemoteWslConnectionProvider = Symbol('RemoteWslConnectionProvider');
export type RemoteWslConnectionProvider = {
    getWslDistributions(): Promise<WslDistribution[]>;
    connectToWsl(options: WslConnectionOptions): Promise<WslConnectionResult>;
}
