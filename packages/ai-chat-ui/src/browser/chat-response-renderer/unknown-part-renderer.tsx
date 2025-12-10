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

import { injectable } from 'inversify';
import { ChatResponsePartRenderer } from '../chat-response-part-renderer.js';
import { ChatResponseContent, UnknownChatResponseContent } from '@theia/ai-chat/lib/common/index.js';
import { ReactNode } from 'react';
import { nls } from '@theia/core/lib/common/nls.js'
import * as React from 'react';
import { codicon } from '@theia/core/lib/browser/index.js';

@injectable()
export class UnknownPartRenderer implements ChatResponsePartRenderer<UnknownChatResponseContent> {
    canHandle(response: ChatResponseContent): number {
        return response.kind === 'unknown' ? 10 : -1;
    }

    render(response: UnknownChatResponseContent): ReactNode {
        const fallbackMessage = response.fallbackMessage || response.asString?.() || '';

        return (
            <div className="theia-chat-unknown-content">
                <div className="theia-chat-unknown-content-warning">
                    <i className={codicon('warning')} />
                    <span>
                        {nls.localize(
                            'theia/ai/chat-ui/unknown-part-renderer/contentNotRestoreable',
                            "This content (type '{0}') could not be fully restored. It may be from an extension that is no longer available.",
                            response.originalKind
                        )}
                    </span>
                </div>
                <div className="theia-chat-unknown-content-fallback">
                    {fallbackMessage}
                </div>
            </div>
        );
    }
}
