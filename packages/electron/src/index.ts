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
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

interface PackageJson {
    peerDependencies?: {
        electron?: string;
    };
}

interface ElectronPackageJson {
    version: string;
}

const packageJson: PackageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
export const electronRange: string = packageJson.peerDependencies?.electron ?? '';

let electronVersion: string | undefined;
try {
    const electronPackageJson: ElectronPackageJson = require('electron/package.json');
    electronVersion = electronPackageJson.version;
} catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'MODULE_NOT_FOUND') {
        electronVersion = undefined;
    } else {
        throw error;
    }
}
export { electronVersion };

