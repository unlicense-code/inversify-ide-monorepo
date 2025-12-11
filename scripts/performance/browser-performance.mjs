// *****************************************************************************
// Copyright (C) 2021 STMicroelectronics and others.
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
import puppeteer from 'puppeteer';
import { existsSync, ensureDirSync } from 'fs-extra';
import { resolve, dirname } from 'path';
import { delay, githubReporting, isLCP, lcp, measure } from './common-performance.mjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const import.meta.dirname = dirname(__filename);

const workspacePath = resolve('./workspace');
const profilesPath = './profiles/';

let name = 'Browser Frontend Startup';
let url = 'http://localhost:3000/#' + workspacePath;
let folder = 'browser';
let headless = true;
let runs = 10;

(async () => {
    let defaultUrl = true;
    const yargsModule = await import('yargs');
    const { default: yargs } = yargsModule;
    const args = await yargs(process.argv.slice(2)).option('name', {
        alias: 'n',
        desc: 'A name for the test suite',
        type: 'string',
        default: name
    }).option('folder', {
        alias: 'f',
        desc: 'Name of a folder within the "profiles" folder in which to collect trace logs',
        type: 'string',
        default: folder
    }).option('runs', {
        alias: 'r',
        desc: 'The number of times to run the test',
        type: 'number',
        default: runs
    }).option('url', {
        alias: 'u',
        desc: 'URL on which to open Theia in the browser (e.g., to specify a workspace)',
        type: 'string',
        default: url
    }).option('headless', {
        desc: 'Run in headless mode (do not open a browser)',
        type: 'boolean',
        default: headless
    }).wrap(Math.min(120, yargs.terminalWidth())).parse();

    if (args.name) {
        name = args.name.toString();
    }
    if (args.url) {
        url = args.url.toString();
        defaultUrl = false;
    }
    if (args.folder) {
        folder = args.folder.toString();
    }
    if (args.runs) {
        runs = parseInt(args.runs.toString());
    }
    if (args.headless !== undefined && args.headless.toString() === 'false') {
        headless = false;
    }
    if (process.env.GITHUB_ACTIONS) {
        githubReporting.enabled = true;
    }

    // Verify that the application exists
    const indexHTML = resolve(import.meta.dirname, '../../examples/browser/src-gen/frontend/index.html');
    if (!existsSync(indexHTML)) {
        console.error('Browser example app does not exist. Please build it before running this script.');
        process.exit(1);
    }

    if (defaultUrl) { ensureDirSync(workspacePath); }
    ensureDirSync(profilesPath);
    const folderPath = profilesPath + folder;
    ensureDirSync(folderPath);

    const deployed = await waitForDeployed(url, 10, 500);
    if (deployed == false) {
        console.error('Could not connect to application.')
    } else {
        await measurePerformance(name, url, folderPath, headless, runs);
    }
})();

async function measurePerformance(name, url, folder, headless, runs) {

    /** @type import('./common-performance.mjs').TestFunction */
    const testScenario = async (runNr) => {
        const browser = await puppeteer.launch({ headless: headless });
        const page = await browser.newPage();

        const file = folder + '/' + runNr + '.json';
        await page.tracing.start({ path: file, screenshots: true });
        await page.goto(url);
        // This selector is for the theia application, which is exposed when the loading indicator vanishes
        await page.waitForSelector('.theia-ApplicationShell', { visible: true });
        // Prevent tracing from stopping too soon and skipping a LCP candidate
        await delay(1000);

        await page.tracing.stop();

        await browser.close();

        return file;
    };

    measure(name, lcp, runs, testScenario, isStart, isLCP);
}

function isStart(x) {
    return x.name === 'TracingStartedInBrowser';
}

async function waitForDeployed(url, maxTries, ms) {
    let deployed = true;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto(url);
    } catch (e) {
        await delay(ms);
        let newTries = maxTries - 1;
        if (newTries > 0) {
            deployed = await waitForDeployed(url, newTries, ms);
        } else {
            browser.close();
            return false;
        }
    }
    browser.close();
    return deployed;
}
