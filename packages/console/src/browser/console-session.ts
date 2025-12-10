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

import { injectable } from 'inversify';
import { MaybePromise } from '@theia/core/lib/common/types.js';
import { TreeElement, CompositeTreeElement, TreeSource } from '@theia/core/lib/browser/source-tree/index.js';
import { Emitter } from '@theia/core/lib/common/event.js';
import { Severity } from '@theia/core/lib/common/severity.js';

export type ConsoleItem = TreeElement & {
    readonly severity?: Severity;
}
export namespace ConsoleItem {
    export const errorClassName = 'theia-console-error';
    export const warningClassName = 'theia-console-warning';
    export const infoClassName = 'theia-console-info';
    export const logClassName = 'theia-console-log';
}

export type CompositeConsoleItem = ConsoleItem & CompositeTreeElement & {
    getElements(): MaybePromise<IterableIterator<ConsoleItem>>
}

@injectable()
export abstract class ConsoleSession extends TreeSource {
    protected selectedSeverity?: Severity;
    protected readonly selectionEmitter: Emitter<void> = new Emitter<void>();
    readonly onSelectionChange = this.selectionEmitter.event;
    declare id: string;

    get severity(): Severity | undefined {
        return this.selectedSeverity;
    }

    set severity(severity: Severity | undefined) {
        if (severity === this.selectedSeverity) {
            return;
        }

        this.selectedSeverity = severity;
        this.selectionEmitter.fire(undefined);
        this.fireDidChange();
    }

    abstract override getElements(): MaybePromise<IterableIterator<ConsoleItem>>;
    abstract execute(value: string): MaybePromise<void>;
    abstract clear(): MaybePromise<void>;
}
