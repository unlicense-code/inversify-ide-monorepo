// *****************************************************************************
// Copyright (C) 2019 TypeFox and others.
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

import { resolve, dirname } from 'path';
import chalk from 'chalk';
import { execSync, exec } from 'child_process';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distTag = process.argv[2];

checkPublish(distTag).catch(error => {
    console.error(error);
    process.exitCode = 1;
});

async function checkPublish(distTag) {
    const workspaces = JSON.parse(execSync('node scripts/get-workspaces.mjs --json').toString());
    await Promise.all(workspaces.map(async workspace => {
        const packagePath = resolve(workspace.location, 'package.json');
        const pck = JSON.parse(await readFile(packagePath, 'utf8'));
        if (!pck.private) {
            let pckName;
            let npmViewOutput;

            if (distTag === 'next') {
                pckName = `${pck.name}@next`;
                npmViewOutput = await new Promise(
                    resolve => exec(`npm view ${pckName} version`,
                        (error, stdout, stderr) => {
                            if (error) {
                                console.error(error);
                                resolve('');
                            } else {
                                // update pckName print to the actual next version below
                                pckName = `${pck.name}@${stdout.trim()}`;
                                resolve(pckName);
                            }
                        }
                    )
                );
            } else {
                pckName = `${pck.name}@${pck.version}`
                npmViewOutput = await new Promise(
                    resolve => exec(`npm view ${pckName} version`,
                        (error, stdout, stderr) => {
                            if (error) {
                                console.error(error);
                                resolve('');
                            } else {
                                resolve(stdout.trim());
                            }
                        }
                    )
                );
            }

            if (npmViewOutput) {
                console.info(`${pckName}: published`);
            } else {
                console.error(`(${chalk.red('ERR')}) ${pckName}: ${chalk.red('NOT')} published`);
                process.exitCode = 1;
            }
        }
    }));
}
