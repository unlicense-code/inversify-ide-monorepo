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

import * as React from 'react';
import { inject, injectable } from 'inversify';
import { DockPanel } from '@lumino/widgets';
import { URI } from '@theia/core/lib/common/uri.js';
import { SymbolKind, Range } from 'vscode-languageserver-protocol';
import { TreeNode } from '@theia/core/lib/browser/tree/tree.js';
import { EditorManager } from '@theia/editor/lib/browser/editor-manager.js';
import { ContextMenuRenderer } from '@theia/core/lib/browser/context-menu-renderer.js';
import { TreeWidget, TreeProps } from '@theia/core/lib/browser/tree/tree-widget.js';
import { TypeHierarchyTreeModel } from './typehierarchy-tree-model.js';
import { TypeHierarchyTree } from './typehierarchy-tree.js';
import { codicon } from '@theia/core/lib/browser/index.js';
import { nls } from '@theia/core/lib/common/nls.js';

@injectable()
export class TypeHierarchyTreeWidget extends TreeWidget {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected readonly icons = new Map(Array.from(Object.keys(SymbolKind)).map(key => [(SymbolKind as any)[key], key.toLocaleLowerCase()] as [number, string]));

    @inject(EditorManager) readonly editorManager: EditorManager;

    constructor(
        @inject(TreeProps) props: TreeProps,
        @inject(TypeHierarchyTreeModel) override readonly model: TypeHierarchyTreeModel,
        @inject(ContextMenuRenderer) contextMenuRenderer: ContextMenuRenderer
    ) {
        super(props, model, contextMenuRenderer);
        this.id = TypeHierarchyTreeWidget.WIDGET_ID;
        this.title.label = TypeHierarchyTreeWidget.WIDGET_LABEL;
        this.title.caption = TypeHierarchyTreeWidget.WIDGET_LABEL;
        this.addClass(TypeHierarchyTreeWidget.Styles.TYPE_HIERARCHY_TREE_CLASS);
        this.title.closable = true;
        this.title.iconClass = codicon('type-hierarchy');
        this.toDispose.push(this.model.onSelectionChanged((selection: ReadonlyArray<TreeNode> | undefined) => {
            if (!selection || selection.length === 0) {
                return;
            }
            const node = selection[0];
            if (node) {
                this.openEditor(node, true);
            }
        }));
        this.toDispose.push(this.model.onOpenNode(node => this.openEditor(node)));
    }

    /**
     * Initializes the widget with the new input.
     */
    async initialize(options: TypeHierarchyTree.InitOptions): Promise<void> {
        await this.model.initialize(options);
    }

    /**
     * See: `TreeWidget#renderIcon`.
     */
    protected override renderIcon(node: TreeNode): React.ReactNode {
        if (TypeHierarchyTree.Node.is(node)) {
            return <div className={'symbol-icon-center codicon codicon-symbol-' + this.icons.get(node.item.kind) || 'unknown'}></div>;
        }
        return undefined;
    }

    /**
     * Opens up the node in the editor. On demand (`keepFocus`) it reveals the location in the editor.
     */
    protected async openEditor(node: TreeNode, keepFocus: boolean = false): Promise<void> {
        if (TypeHierarchyTree.Node.is(node)) {
            const { selectionRange, uri } = node.item;
            const editorWidget = await this.editorManager.open(new URI(uri), {
                mode: keepFocus ? 'reveal' : 'activate',
                selection: Range.create(selectionRange.start, selectionRange.end)
            });
            if (editorWidget.parent instanceof DockPanel) {
                editorWidget.parent.selectWidget(editorWidget);
            }
        }
    }

}

export namespace TypeHierarchyTreeWidget {

    export const WIDGET_ID = 'theia-typehierarchy';
    export const WIDGET_LABEL = nls.localizeByDefault('Type Hierarchy');

    /**
     * CSS styles for the `Type Hierarchy` widget.
     */
    export namespace Styles {

        export const TYPE_HIERARCHY_TREE_CLASS = 'theia-type-hierarchy-tree';

    }
}
