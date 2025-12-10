// *****************************************************************************
// Copyright (C) 2025 AwesomeOS and Contributors
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

export const TextReplacementContribution = Symbol('TextReplacementContribution');

export type TextReplacementContribution = {
    /**
     * This method returns a map of **default values** and their replacement values for the specified locale.
     * **Do not** use the keys of the `nls.localization` call, but the English default values.
     *
     * @param locale The locale for which the replacement should be returned.
     * @returns A map of default values and their replacement values.
     */
    getReplacement(locale: string): Record<string, string>;
}
