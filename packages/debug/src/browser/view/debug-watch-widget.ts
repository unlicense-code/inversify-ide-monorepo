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

import { injectable, inject, postConstruct, interfaces } from 'inversify';
import { MenuPath } from '@theia/core/lib/common/index.js';
import { SourceTreeWidget } from '@theia/core/lib/browser/source-tree/source-tree-widget.js';
import { DebugWatchSource } from './debug-watch-source.js';
import { DebugViewModel } from './debug-view-model.js';
import { nls } from '@theia/core/lib/common/nls.js'

@injectable()
export class DebugWatchWidget extends SourceTreeWidget {

    static CONTEXT_MENU: MenuPath = ['debug-watch-context-menu'];
    static EDIT_MENU = [...DebugWatchWidget.CONTEXT_MENU, 'a_edit'];
    static REMOVE_MENU = [...DebugWatchWidget.CONTEXT_MENU, 'b_remove'];
    static FACTORY_ID = 'debug:watch';
    static override createContainer(parent: interfaces.Container): interfaces.Container {
        const child = SourceTreeWidget.createContainer(parent, {
            contextMenuPath: DebugWatchWidget.CONTEXT_MENU,
            virtualized: false,
            scrollIfActive: true
        });
        child.bind(DebugWatchSource).toSelf();
        child.unbind(SourceTreeWidget);
        child.bind(DebugWatchWidget).toSelf();
        return child;
    }
    static createWidget(parent: interfaces.Container): DebugWatchWidget {
        return DebugWatchWidget.createContainer(parent).get(DebugWatchWidget);
    }

    @inject(DebugViewModel)
    readonly viewModel: DebugViewModel;

    @inject(DebugWatchSource)
    protected readonly variables: DebugWatchSource;

    @postConstruct()
    protected override init(): void {
        super.init();
        this.id = DebugWatchWidget.FACTORY_ID + ':' + this.viewModel.id;
        this.title.label = nls.localizeByDefault('Watch');
        this.toDispose.push(this.variables);
        this.source = this.variables;
    }

}
