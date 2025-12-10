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

import { injectable, inject, postConstruct } from 'inversify';
import { FileService } from '@theia/filesystem/lib/browser/file-service.js';
import { FileSystemProvider } from '@theia/filesystem/lib/common/files.js';
import { UserStorageContribution } from '@theia/userstorage/lib/browser/user-storage-contribution.js';
import { RemoteStatusService } from '../electron-common/remote-status-service.js';
import { LocalEnvVariablesServer, LocalRemoteFileSystemProvider } from './local-backend-services.js';
import { Deferred } from '@theia/core/lib/common/promise-util.js';
import { URI } from '@theia/core/lib/common/uri.js';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables/index.js';
import { getCurrentPort } from '@theia/core/lib/electron-browser/messaging/electron-local-ws-connection-source.js';

/**
 * This overide is to have remote connections still use settings, keymaps, etc. from the local machine.
 */
@injectable()
export class RemoteUserStorageContribution extends UserStorageContribution {
    @inject(RemoteStatusService)
    protected readonly remoteStatusService: RemoteStatusService;

    @inject(LocalRemoteFileSystemProvider)
    protected readonly localRemoteFileSystemProvider: LocalRemoteFileSystemProvider;

    @inject(LocalEnvVariablesServer)
    protected readonly localEnvironments: EnvVariablesServer;

    isRemoteConnection: Deferred<boolean> = new Deferred();

    @postConstruct()
    protected init(): void {
        const port = getCurrentPort();
        if (port) {
            this.remoteStatusService.getStatus(Number(port)).then(status => this.isRemoteConnection.resolve(status.alive));
        }
    }

    protected override async getDelegate(service: FileService): Promise<FileSystemProvider> {
        return await this.isRemoteConnection.promise ?
            this.localRemoteFileSystemProvider
            : service.activateProvider('file');
    }

    protected override async getCongigDirUri(): Promise<URI> {
        return await this.isRemoteConnection.promise ?
            new URI(await this.localEnvironments.getConfigDirUri())
            : super.getCongigDirUri();
    }

}
