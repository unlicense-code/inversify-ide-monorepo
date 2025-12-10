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

import { URI } from '@theia/core';
import { CancellationToken } from '@theia/core';
import { Progress } from '@theia/core';
import { Event } from '@theia/core';

export type CustomDataTransfer = Iterable<readonly [string, CustomDataTransferItem]>;

export type CustomDataTransferItem = {
    asFile(): {
        readonly id: string;
        readonly name: string;
        data(): Promise<Uint8Array>;
    } | undefined
}

export type FileUploadService = {
    upload(targetUri: string | URI, params?: FileUploadService.UploadParams): Promise<FileUploadService.UploadResult>;
    readonly onDidUpload: Event<string[]>;
}

export namespace FileUploadService {
    export type Source = FormData | DataTransfer | CustomDataTransfer;
    export interface UploadEntry {
        file: File
        uri: URI
    }
    export interface Context {
        progress: Progress
        token: CancellationToken
        accept: (entry: UploadEntry) => Promise<void>
    }
    export interface Form {
        targetInput: HTMLInputElement
        fileInput: HTMLInputElement
        onDidUpload?: (uri: string) => void
    }
    export interface UploadParams {
        source?: FileUploadService.Source,
        progress?: Progress,
        token?: CancellationToken,
        onDidUpload?: (uri: string) => void,
        leaveInTemp?: boolean
    }
    export interface UploadResult {
        uploaded: string[]
    }
}

export const FileUploadService = Symbol('FileUploadService');
