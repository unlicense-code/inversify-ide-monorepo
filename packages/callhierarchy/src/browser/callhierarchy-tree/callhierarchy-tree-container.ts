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

import { interfaces } from 'inversify';
import { createTreeContainer } from '@theia/core/lib/browser/index.js';
import { CallHierarchyTree } from './callhierarchy-tree.js';
import { CallHierarchyTreeModel } from './callhierarchy-tree-model.js';
import { CallHierarchyTreeWidget } from './callhierarchy-tree-widget.js';

function createHierarchyTreeContainer(parent: interfaces.Container): interfaces.Container {
    const child = createTreeContainer(parent, {
        tree: CallHierarchyTree,
        model: CallHierarchyTreeModel,
        widget: CallHierarchyTreeWidget,
    });

    return child;
}

export function createHierarchyTreeWidget(parent: interfaces.Container): CallHierarchyTreeWidget {
    return createHierarchyTreeContainer(parent).get<CallHierarchyTreeWidget>(CallHierarchyTreeWidget);
}
