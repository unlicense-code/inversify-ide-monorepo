// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
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

import { ChatAgentLocation } from './chat-agents.js';

export type SerializableChangeSetElement = {
    kind?: string;
    uri: string;
    name?: string;
    icon?: string;
    additionalInfo?: string;
    state?: 'pending' | 'applied' | 'stale';
    type?: 'add' | 'modify' | 'delete';
    data?: { [key: string]: unknown };
}

export type SerializableChangeSetFileElementData = {
    targetState?: string;
    originalState?: string;
    replacements?: Array<{
        oldContent: string;
        newContent: string;
        multiple?: boolean;
    }>;
}

export type SerializableChatRequestData = {
    id: string;
    text: string;
    agentId?: string;
    changeSet?: {
        title: string;
        elements: SerializableChangeSetElement[];
    };
}

export type SerializableChatResponseContentData<T = unknown> = {
    kind: string;
    /**
     * Fallback message used when the deserializer for this content type is not available.
     */
    fallbackMessage?: string;
    data: T; // Content-specific serialization
}

export type SerializableChatResponseData = {
    id: string;
    requestId: string;
    isComplete: boolean;
    isError: boolean;
    errorMessage?: string;
    content: SerializableChatResponseContentData[];
}

export type SerializableHierarchyBranchItem = {
    requestId: string;
    nextBranchId?: string;
}

export type SerializableHierarchyBranch = {
    /** Unique identifier for this branch */
    id: string;
    /** All items (alternative requests) in this branch */
    items: SerializableHierarchyBranchItem[];
    /** Index of the currently active item in this branch */
    activeBranchIndex: number;
}

export type SerializableHierarchy = {
    /** ID of the root branch where the hierarchy starts */
    rootBranchId: string;
    /** Map of branch ID to branch data for all branches in the hierarchy */
    branches: { [branchId: string]: SerializableHierarchyBranch };
}

export type SerializedChatModel = {
    sessionId: string;
    location: ChatAgentLocation;
    /**
     * The complete hierarchy of requests including all alternatives (branches).
     */
    hierarchy: SerializableHierarchy;
    /** All requests referenced by the hierarchy */
    requests: SerializableChatRequestData[];
    /** All responses for the requests */
    responses: SerializableChatResponseData[];
}

export type SerializedChatData = {
    version: number;
    pinnedAgentId?: string;
    title?: string;
    model: SerializedChatModel;
    saveDate: number;
}

export type SerializableChatsData = {
    [sessionId: string]: SerializedChatData;
}

export const CHAT_DATA_VERSION = 1;
