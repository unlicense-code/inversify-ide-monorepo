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

import { injectable } from 'inversify';
import { UserStorageUri } from '@theia/userstorage/lib/browser/user-storage-uri.js';
import { FileServiceContribution, FileService } from '@theia/filesystem/lib/browser/file-service.js';
import { Schemes } from '@theia/plugin-ext/lib/common/uri-components.js';
import { DelegatingFileSystemProvider } from '@theia/filesystem/lib/common/delegating-file-system-provider.js';

@injectable()
export class PluginVSCodeContribution implements FileServiceContribution {

    registerFileSystemProviders(service: FileService): void {
        this.mapSchemas(service, Schemes.vscodeRemote, 'file');
        this.mapSchemas(service, Schemes.userData, UserStorageUri.scheme);
    }

    protected mapSchemas(service: FileService, from: string, to: string): void {
        service.onWillActivateFileSystemProvider(event => {
            if (event.scheme === from) {
                event.waitUntil((async () => {
                    const provider = await service.activateProvider(to);
                    service.registerProvider(from, new DelegatingFileSystemProvider(provider, {
                        uriConverter: {
                            to: resource => resource.withScheme(to),
                            from: resource => resource.withScheme(from)
                        }
                    }));
                })());
            }
        });
    }

}
