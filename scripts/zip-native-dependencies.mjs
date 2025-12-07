// *****************************************************************************
// Copyright (C) 2023 TypeFox and others.
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
const glob = require('glob');
import { createWriteStream } from 'fs';
import { join, dirname } from 'path';
import archiver from 'archiver';
import { stat } from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
    const repoPath = join(__dirname, '..');
    const zipFile = join(__dirname, `native-dependencies-${process.platform}-${process.arch}.zip`);
    const browserAppPath = join(repoPath, 'examples', 'browser');
    const nativeDependencies = await glob('lib/backend/native/**', {
        cwd: browserAppPath
    });
    const buildDependencies = await glob('lib/build/Release/**', {
        cwd: browserAppPath
    });
    const trashDependencies = await glob('lib/backend/{windows-trash.exe,macos-trash}', {
        cwd: browserAppPath
    });
    const archive = archiver('zip');
    const output = createWriteStream(zipFile, { flags: "w" });
    archive.pipe(output);
    for (const file of [
        ...nativeDependencies,
        ...buildDependencies,
        ...trashDependencies
    ]) {
        const filePath = join(browserAppPath, file);
        archive.file(filePath, {
            name: file,
            mode: (await stat(filePath)).mode
        });
    }
    await archive.finalize();
}

run();
