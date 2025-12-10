// *****************************************************************************
// Copyright (C) 2026 AwesomeOS and Contributors.
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
// some code copied and modified from https://github.com/microsoft/vscode/blob/3aab025eaebde6c9544293b6c7554f3f583e15d0/src/vs/workbench/contrib/timeline/common/timeline.ts

import { Command, Disposable, Event } from '@theia/core/lib/common/index.js';
import { URI } from 'vscode-uri';
import { ThemeIcon } from '@theia/core/lib/common/theme.js';
import { MarkdownString } from '@theia/core/lib/common/markdown-rendering';
import { AccessibilityInformation } from '@theia/core/lib/common/accessibility.js';

export type TimelineItem = {
    source: string;
    uri: string;
    handle: string;
    timestamp: number;
    label: string;
    id?: string;
    icon?: string | { light: string; dark: string } | ThemeIcon
    description?: string;
    tooltip?: string | MarkdownString | undefined;
    command?: Command & { arguments?: unknown[] };
    contextValue?: string;
    accessibilityInformation?: AccessibilityInformation;
}

export type TimelineChangeEvent = {
    id: string;
    uri: URI | undefined;
    reset: boolean
}

export type TimelineProvidersChangeEvent = {
    readonly added?: string[];
    readonly removed?: string[];
}

export type TimelineOptions = {
    cursor?: string;
    limit?: number | { timestamp: number; id?: string };
}

export type InternalTimelineOptions = {
    cacheResults: boolean;
    resetCache: boolean;
}

export type Timeline = {
    source: string;

    paging?: {
        readonly cursor: string | undefined;
    }

    items: TimelineItem[];
}

export type TimelineProviderDescriptor = {
    id: string;
    label: string;
    scheme: string | string[];
}

export type TimelineProvider = TimelineProviderDescriptor & Disposable & {
    onDidChange?: Event<TimelineChangeEvent>;
    provideTimeline(uri: URI, options: TimelineOptions, internalOptions?: InternalTimelineOptions): Promise<Timeline | undefined>;
}

export type TimelineSource = {
    id: string;
    label: string;
}
