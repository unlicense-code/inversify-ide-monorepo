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

import { ContainerModule, interfaces } from 'inversify';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager.js';
import { TimelineService } from './timeline-service.js';
import { TimelineWidget } from './timeline-widget.js';
import { TimelineTreeWidget } from './timeline-tree-widget.js';
import { createTreeContainer, } from '@theia/core/lib/browser/index.js';
import { TimelineTreeModel } from './timeline-tree-model.js';
import { TimelineEmptyWidget } from './timeline-empty-widget.js';
import { TimelineContextKeyService } from './timeline-context-key-service.js';
import { TimelineContribution } from './timeline-contribution.js';

import '../../src/browser/style/index.css';
import { CommandContribution } from '@theia/core/lib/common/index.js';
import { TabBarToolbarContribution } from '@theia/core/lib/browser/shell/tab-bar-toolbar/index.js';

export default new ContainerModule(bind => {
    bind(TimelineContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(TimelineContribution);
    bind(TabBarToolbarContribution).toService(TimelineContribution);

    bind(TimelineContextKeyService).toSelf().inSingletonScope();
    bind(TimelineService).toSelf().inSingletonScope();

    bind(TimelineWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(({ container }) => ({
        id: TimelineWidget.ID,
        createWidget: () => container.get(TimelineWidget)
    })).inSingletonScope();
    bind(TimelineTreeWidget).toDynamicValue(ctx => {
        const child = createTimelineTreeContainer(ctx.container);
        return child.get(TimelineTreeWidget);
    });
    bind(WidgetFactory).toDynamicValue(({ container }) => ({
        id: TimelineTreeWidget.ID,
        createWidget: () => container.get(TimelineTreeWidget)
    })).inSingletonScope();
    bind(TimelineEmptyWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(({ container }) => ({
        id: TimelineEmptyWidget.ID,
        createWidget: () => container.get(TimelineEmptyWidget)
    })).inSingletonScope();
});

export function createTimelineTreeContainer(parent: interfaces.Container): interfaces.Container {
    const child = createTreeContainer(parent, {
        props: {
            virtualized: true,
            search: true
        },
        widget: TimelineTreeWidget,
        model: TimelineTreeModel
    });

    return child;
}
