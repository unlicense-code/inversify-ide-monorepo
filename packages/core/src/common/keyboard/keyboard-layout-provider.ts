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

import type { IKeyboardLayoutInfo, IKeyboardMapping } from 'native-keymap';
import { Event } from '../event.js';

export const keyboardPath = '/services/keyboard';

export const KeyboardLayoutProvider = Symbol('KeyboardLayoutProvider');

export type KeyboardLayoutProvider = {
    getNativeLayout(): Promise<NativeKeyboardLayout>;
}

export const KeyboardLayoutChangeNotifier = Symbol('KeyboardLayoutChangeNotifier');

export type KeyboardLayoutChangeNotifier = {
    onDidChangeNativeLayout: Event<NativeKeyboardLayout>;
}

export type KeyValidationInput = {
    code: string;
    character: string;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
}

export const KeyValidator = Symbol('KeyValidator');

export type KeyValidator = {
    validateKey(input: KeyValidationInput): void;
}

export type NativeKeyboardLayout = {
    info: IKeyboardLayoutInfo;
    mapping: IKeyboardMapping;
}
