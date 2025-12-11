#!/usr/bin/env node
/**
 * Get workspace packages information (replacement for lerna ls)
 * Usage: node scripts/get-workspaces.mjs [--json] [--graph] [--all]
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { sync: globSync } = require('glob');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const json = args.includes('--json');
const graph = args.includes('--graph');
const all = args.includes('--all');

const rootDir = join(__dirname, '..');
const packageJsonPath = join(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

/**
 * Get all workspace packages using glob patterns
 */
function getWorkspaces() {
    const workspaces = packageJson.workspaces || [];
    const packages = [];
    const seen = new Set();

    for (const workspacePattern of workspaces) {
        // Convert workspace pattern to glob pattern
        const globPattern = workspacePattern.replace(/\*\*/g, '**').replace(/\*/g, '*');
        const fullPattern = join(rootDir, globPattern, 'package.json');

        const matches = globSync(fullPattern, {
            absolute: true,
            ignore: ['**/node_modules/**']
        });

        for (const pkgJsonPath of matches) {
            if (seen.has(pkgJsonPath)) continue;
            seen.add(pkgJsonPath);

            try {
                const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
                if (pkg.name) {
                    packages.push({
                        name: pkg.name,
                        location: dirname(pkgJsonPath),
                        version: pkg.version,
                        private: pkg.private || false
                    });
                }
            } catch (e) {
                // Skip invalid package.json
            }
        }
    }

    return packages.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Build dependency graph
 */
function buildGraph(packages) {
    const graph = {};
    const packageMap = new Map(packages.map(p => [p.name, p]));

    for (const pkg of packages) {
        const pkgJsonPath = join(pkg.location, 'package.json');
        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));

        const deps = [
            ...Object.keys(pkgJson.dependencies || {}),
            ...Object.keys(pkgJson.devDependencies || {}),
            ...Object.keys(pkgJson.peerDependencies || {})
        ];

        // Filter to only include workspace packages
        const workspaceDeps = deps.filter(dep => packageMap.has(dep));

        graph[pkg.name] = workspaceDeps;
    }

    return graph;
}

const packages = getWorkspaces();

if (graph) {
    const depGraph = buildGraph(packages);
    if (json) {
        console.log(JSON.stringify(depGraph, null, 2));
    } else {
        console.log(JSON.stringify(depGraph));
    }
} else {
    if (json) {
        console.log(JSON.stringify(packages, null, 2));
    } else {
        for (const pkg of packages) {
            console.log(pkg.name);
        }
    }
}
