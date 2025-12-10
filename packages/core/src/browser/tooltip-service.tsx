// *****************************************************************************
// Copyright (C) 2021 Arm and others.
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

import { injectable, inject, optional, postConstruct } from 'inversify';
import * as React from 'react';
import ReactTooltipLib from 'react-tooltip';
import { ReactRenderer, RendererHost } from './widgets/react-renderer.js';
import { generateUuid } from '../common/uuid.js';
import { CorePreferences } from '../common/core-preferences.js';

export const TooltipService = Symbol('TooltipService');

export type TooltipService = {
    tooltipId: string;
    attachTo(host: HTMLElement): void;
    update(fullRender?: boolean): void;
}

export type TooltipAttributes = {
    /**
     * HTML to render in the tooltip.
     */
    'data-tip': string;
    /**
     * The ID of the tooltip renderer. Should be TOOLTIP_ID.
     */
    'data-for': string;
}

const DELAY_PREFERENCE = 'workbench.hover.delay';

@injectable()
export class TooltipServiceImpl extends ReactRenderer implements TooltipService {

    @inject(CorePreferences)
    protected readonly corePreferences: CorePreferences;

    public readonly tooltipId: string;
    protected rendered = false;

    constructor(
        @inject(RendererHost) @optional() host?: RendererHost
    ) {
        super(host);
        this.tooltipId = generateUuid();
    }

    @postConstruct()
    protected init(): void {
        this.toDispose.push(this.corePreferences.onPreferenceChanged(preference => {
            if (preference.preferenceName === DELAY_PREFERENCE) {
                this.update(true);
            }
        }));
    }

    public attachTo(host: HTMLElement): void {
        host.appendChild(this.host);
    }

    public update(fullRender = false): void {
        if (fullRender || !this.rendered) {
            this.render();
            this.rendered = true;
        }

        (ReactTooltipLib as any).rebuild();
    }

    protected override doRender(): React.ReactNode {
        const hoverDelay = this.corePreferences.get(DELAY_PREFERENCE);
        const ReactTooltip = ReactTooltipLib as any as React.ComponentType<any>;
        return <ReactTooltip id={this.tooltipId} className='theia-tooltip' html={true} delayShow={hoverDelay} />;
    }

    public override dispose(): void {
        this.toDispose.dispose();
        super.dispose();
    }
}
