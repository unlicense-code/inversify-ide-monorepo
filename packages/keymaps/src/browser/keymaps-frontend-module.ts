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

import './keymaps-monaco-contribution.js';
import '../../src/browser/style/index.css';
import { ContainerModule } from 'inversify';
import { KeymapsService } from './keymaps-service.js';
import { KeymapsFrontendContribution } from './keymaps-frontend-contribution.js';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common/index.js';
import { KeybindingContribution } from '@theia/core/lib/browser/keybinding.js';
import { TabBarToolbarContribution } from '@theia/core/lib/browser/shell/tab-bar-toolbar/index.js';
import {
    noopWidgetStatusBarContribution, WidgetFactory, WidgetStatusBarContribution

} from '@theia/core/lib/browser/index.js';
import { KeybindingWidget } from './keybindings-widget.js';
import { KeybindingSchemaUpdater } from './keybinding-schema-updater.js';
import { JsonSchemaContribution } from '@theia/core/lib/browser/json-schema-store.js';

export default new ContainerModule(bind => {
    bind(KeymapsService).toSelf().inSingletonScope();
    bind(KeymapsFrontendContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(KeymapsFrontendContribution);
    bind(KeybindingContribution).toService(KeymapsFrontendContribution);
    bind(MenuContribution).toService(KeymapsFrontendContribution);
    bind(KeybindingWidget).toSelf();
    bind(TabBarToolbarContribution).toService(KeymapsFrontendContribution);
    bind(WidgetFactory).toDynamicValue(context => ({
        id: KeybindingWidget.ID,
        createWidget: () => context.container.get<KeybindingWidget>(KeybindingWidget),
    })).inSingletonScope();
    bind(KeybindingSchemaUpdater).toSelf().inSingletonScope();
    bind(JsonSchemaContribution).toService(KeybindingSchemaUpdater);
    bind(WidgetStatusBarContribution).toConstantValue(noopWidgetStatusBarContribution(KeybindingWidget));
});
