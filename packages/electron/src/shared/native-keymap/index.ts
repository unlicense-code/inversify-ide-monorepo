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

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nativeKeymap = require('native-keymap');
export default nativeKeymap;
export * from 'native-keymap';
// Re-export all named exports from native-keymap
export const getCurrentKeyboardLayout = nativeKeymap.getCurrentKeyboardLayout;
export const getKeyMap = nativeKeymap.getKeyMap;
export const getKeyboardLayout = nativeKeymap.getKeyboardLayout;

