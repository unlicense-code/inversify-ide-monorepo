#!/usr/bin/env node
// *****************************************************************************
// Copyright (C) 2018 TypeFox and others.
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
// @ts-check

import { readFileSync, writeFileSync } from 'fs';
import { basename, join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function replaceCopyrights() {
    const fileNames = execSync(`git grep --name-only 'Copyright'`, { encoding: 'utf8' })
        .split(new RegExp('\r?\n'))
        .filter(_ => _.trim().length !== 0);
    for (const fileName of fileNames) {
        try {
            const content = readFileSync(fileName, { encoding: 'UTF-8' });
            const result = content.replace(new RegExp('\\/\\*.*\r?\n.*(Copyright.*\\d{4}.*)(\r?\n|.)*?\\*\\/'), `/********************************************************************************
 * $1
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 ********************************************************************************/`);
            writeFileSync(fileName, result);
        } catch (e) {
            console.error(`Failed to replace copyrights for ${fileName}`, e);
        }
    }
}

function replaceLicenses() {
    const fileNames = execSync(`git grep --name-only 'Apache-2.0'`, { encoding: 'utf8' })
        .split(new RegExp('\r?\n'))
        .filter(_ => _.trim().length !== 0);
    for (const fileName of fileNames) {
        try {
            if (basename(fileName) === 'README.md') {
                const content = readFileSync(fileName, { encoding: 'UTF-8' });
                const result = content.replace('[Apache-2.0](https://github.com/eclipse-theia/theia/blob/master/LICENSE)', `- [Eclipse Public License 2.0](http://www.eclipse.org/legal/epl-2.0/)
- [一 (Secondary) GNU General Public License, version 2 with the GNU Classpath Exception](https://projects.eclipse.org/license/secondary-gpl-2.0-cp)`);
                writeFileSync(fileName, result);
            }
            if (basename(fileName) === 'package.json') {
                const content = readFileSync(fileName, { encoding: 'UTF-8' });
                const result = content.replace('"license": "Apache-2.0"', '"license": "EPL-2.0 OR GPL-2.0-with-classpath-exception"');
                writeFileSync(fileName, result);
            }
        } catch (e) {
            console.error(`Failed to replace license for ${fileName}`, e);
        }
    }
}

replaceCopyrights();
replaceLicenses();
