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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type RendererMetadata = {
    readonly id: string;
    readonly entrypoint: { readonly uri: string, readonly extends?: string; };
    readonly mimeTypes: readonly string[];
    readonly requiresMessaging: boolean;
}

export type CustomRendererMessage = {
    readonly type: 'customRendererMessage';
    readonly rendererId: string;
    readonly message: unknown;
}

export type UpdateRenderersMessage = {
    readonly type: 'updateRenderers';
    readonly rendererData: readonly RendererMetadata[];
}

export type CellOutputChange = {
    readonly cellHandle: number;
    readonly newOutputs?: Output[];
    readonly start: number;
    readonly deleteCount: number;
}

export type OutputChangedMessage = {
    readonly type: 'outputChanged';
    changes: CellOutputChange[];
}

export type ChangePreferredMimetypeMessage = {
    readonly type: 'changePreferredMimetype';
    readonly cellHandle: number;
    readonly outputId: string;
    readonly mimeType: string;
}

export type KernelMessage = {
    readonly type: 'customKernelMessage';
    readonly message: unknown;
}

export type PreloadMessage = {
    readonly type: 'preload';
    readonly resources: string[];
}

export type notebookStylesMessage = {
    readonly type: 'notebookStyles';
    styles: Record<string, string>;
}

export type CellHeigthsMessage = {
    type: 'cellHeigths';
    cellHeigths: Record<number, number>;
}

export type CellsMoved = {
    type: 'cellMoved';
    cellHandle: number;
    toIndex: number;
}

export type CellsSpliced = {
    type: 'cellsSpliced';
    /**
     * Cell handle for the start cell.
     * -1 in case of new Cells are added at the end.
     */
    startCellHandle: number;
    deleteCount: number;
    newCells: number[];
}

export type CellsChangedMessage = {
    type: 'cellsChanged';
    changes: Array<CellsMoved | CellsSpliced>;
}

export type CellHeightUpdateMessage = {
    type: 'cellHeightUpdate';
    cellKind: number;
    cellHandle: number;
    height: number;
}

export type OutputVisibilityChangedMessage = {
    type: 'outputVisibilityChanged';
    cellHandle: number;
    visible: boolean;
}

export type ToWebviewMessage = UpdateRenderersMessage
    | OutputChangedMessage
    | ChangePreferredMimetypeMessage
    | CustomRendererMessage
    | KernelMessage
    | PreloadMessage
    | notebookStylesMessage
    | CellHeigthsMessage
    | CellHeightUpdateMessage
    | CellsChangedMessage
    | OutputVisibilityChangedMessage;

export type WebviewInitialized = {
    readonly type: 'initialized';
}

export type OnDidRenderOutput = {
    readonly type: 'didRenderOutput';
    cellHandle: number;
    outputId: string;
    outputHeight: number;
    bodyHeight: number;
}

export type WheelMessage = {
    readonly type: 'did-scroll-wheel';
    readonly deltaY: number;
    readonly deltaX: number;
}

export type InputFocusChange = {
    readonly type: 'inputFocusChanged';
    readonly focused: boolean;
}

export type CellOuputFocus = {
    readonly type: 'cellFocusChanged';
    readonly cellHandle: number;
}

export type WebviewFocusChange = {
    readonly type: 'webviewFocusChanged';
    readonly focused: boolean;
}

export type CellHeightRequest = {
    readonly type: 'cellHeightRequest';
    readonly cellHandle: number;
}

export type BodyHeightChange = {
    readonly type: 'bodyHeightChange';
    readonly height: number;
}

export type FromWebviewMessage = WebviewInitialized
    | OnDidRenderOutput
    | WheelMessage
    | CustomRendererMessage
    | KernelMessage
    | InputFocusChange
    | CellOuputFocus
    | WebviewFocusChange
    | CellHeightRequest
    | BodyHeightChange;

export type Output = {
    id: string
    metadata?: Record<string, unknown>;
    items: OutputItem[];
}

export type OutputItem = {
    readonly mime: string;
    readonly data: Uint8Array;
}
