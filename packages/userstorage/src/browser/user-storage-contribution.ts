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

import { inject, injectable } from 'inversify';
import { URI } from '@theia/core/lib/common/uri.js';
import { DisposableCollection } from '@theia/core/lib/common/disposable.js';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables/index.js';
import { FileSystemProvider } from '@theia/filesystem/lib/common/index.js';
import { FileService, FileServiceContribution } from '@theia/filesystem/lib/browser/index.js';
import { DelegatingFileSystemProvider } from '@theia/filesystem/lib/common/index.js';
import { UserStorageUri } from './user-storage-uri.js';
import { MaybePromise } from '@theia/core';

@injectable()
export class UserStorageContribution implements FileServiceContribution {

    @inject(EnvVariablesServer)
    protected readonly environments: EnvVariablesServer;

    registerFileSystemProviders(service: FileService): void {
        service.onWillActivateFileSystemProvider((event: { scheme: string; waitUntil: (promise: Promise<void>) => void }) => {
            if (event.scheme === UserStorageUri.scheme) {
                event.waitUntil((async () => {
                    const provider = await this.createProvider(service);
                    service.registerProvider(UserStorageUri.scheme, provider);
                })());
            }
        });
    }

    protected getDelegate(service: FileService): MaybePromise<FileSystemProvider> {
        return service.activateProvider('file');
    }

    protected async getCongigDirUri(): Promise<URI> {
        return new URI(await this.environments.getConfigDirUri());
    }

    protected async createProvider(service: FileService): Promise<FileSystemProvider> {
        const delegate = await this.getDelegate(service);
        const configDirUri = await this.getCongigDirUri();
        return new DelegatingFileSystemProvider(delegate, {
            uriConverter: {
                to: (resource: URI) => {
                    const relativePath = UserStorageUri.relative(resource);
                    if (relativePath) {
                        return configDirUri.resolve(relativePath).normalizePath();
                    }
                    return undefined;
                },
                from: (resource: URI) => {
                    const relativePath = configDirUri.relative(resource);
                    if (relativePath) {
                        return UserStorageUri.resolve(relativePath);
                    }
                    return undefined;
                }
            }
        }, new DisposableCollection(
            delegate.watch(configDirUri, { excludes: [], recursive: true })
        ));
    }

}
