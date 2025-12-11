#!/usr/bin/env node
/**
 * Run npm scripts in workspaces (replacement for lerna run)
 * Usage: node scripts/run-workspaces.mjs <script> [--scope=<pattern>] [--ignore=<pattern>] [--parallel] [--stream]
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const script = args[0];

if (!script) {
    console.error('Usage: node scripts/run-workspaces.mjs <script> [--scope=<pattern>] [--ignore=<pattern>] [--parallel] [--stream]');
    process.exit(1);
}

const scopePattern = args.find(arg => arg.startsWith('--scope='))?.replace('--scope=', '') || null;
const ignorePattern = args.find(arg => arg.startsWith('--ignore='))?.replace('--ignore=', '') || null;
const parallel = args.includes('--parallel');
const stream = args.includes('--stream');
const scriptArgs = args.slice(1).filter(arg =>
    !arg.startsWith('--scope=') &&
    !arg.startsWith('--ignore=') &&
    arg !== '--parallel' &&
    arg !== '--stream'
);

const rootDir = join(__dirname, '..');
const workspacesOutput = execSync('node scripts/get-workspaces.mjs --json', {
    cwd: rootDir,
    encoding: 'utf8'
});
const workspaces = JSON.parse(workspacesOutput);

// Get dependency graph for topological sorting
const depGraphOutput = execSync('node scripts/get-workspaces.mjs --json --graph', {
    cwd: rootDir,
    encoding: 'utf8'
});
const depGraph = JSON.parse(depGraphOutput);

/**
 * Topologically sort packages by their dependencies
 * Dependencies are built before dependents
 */
function topologicalSort(packages, graph) {
    const packageMap = new Map(packages.map(p => [p.name, p]));
    const visited = new Set();
    const visiting = new Set();
    const result = [];

    function visit(name) {
        if (visiting.has(name)) {
            // Circular dependency detected, but continue anyway
            return;
        }
        if (visited.has(name)) {
            return;
        }

        const pkg = packageMap.get(name);
        if (!pkg) {
            return;
        }

        visiting.add(name);

        // Visit dependencies first
        const deps = graph[name] || [];
        for (const dep of deps) {
            if (packageMap.has(dep)) {
                visit(dep);
            }
        }

        visiting.delete(name);
        visited.add(name);
        result.push(pkg);
    }

    for (const pkg of packages) {
        if (!visited.has(pkg.name)) {
            visit(pkg.name);
        }
    }

    return result;
}

function matchesPattern(name, pattern) {
    if (!pattern) return true;

    // Handle multiple patterns separated by comma
    const patterns = pattern.split(',').map(p => p.trim());

    return patterns.some(p => {
        // Handle glob-like patterns
        if (p.includes('{')) {
            // Expand {a,b} patterns
            const regex = p.replace(/\{([^}]+)\}/g, (match, alternatives) => {
                return `(${alternatives.split(',').map(alt => alt.trim()).join('|')})`;
            }).replace(/\*/g, '.*');
            return new RegExp(`^${regex}$`).test(name);
        }

        // Handle negation
        if (p.startsWith('!')) {
            return !name.includes(p.substring(1));
        }

        // Simple substring match
        return name.includes(p);
    });
}

const filteredWorkspaces = workspaces.filter(pkg => {
    if (scopePattern && !matchesPattern(pkg.name, scopePattern)) {
        return false;
    }
    if (ignorePattern && matchesPattern(pkg.name, ignorePattern)) {
        return false;
    }

    // Check if package has the script
    const pkgJsonPath = join(pkg.location, 'package.json');
    if (!existsSync(pkgJsonPath)) {
        return false;
    }
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    return pkgJson.scripts && pkgJson.scripts[script];
});

if (filteredWorkspaces.length === 0) {
    console.warn(`No workspaces found matching criteria for script "${script}"`);
    process.exit(0);
}

// Sort packages by dependency order (dependencies first) if compiling
if (script === 'compile') {
    // First, find all transitive dependencies of filtered packages
    // This ensures dependencies are built even if they don't match the scope pattern
    const allNeededPackages = new Set(filteredWorkspaces.map(p => p.name));
    let changed = true;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;
        for (const pkgName of Array.from(allNeededPackages)) {
            const deps = depGraph[pkgName] || [];
            for (const dep of deps) {
                if (!allNeededPackages.has(dep)) {
                    // Check if this dependency is in the original workspaces
                    const depPkg = workspaces.find(p => p.name === dep);
                    if (depPkg) {
                        // Check if it has the compile script
                        const depPkgJsonPath = join(depPkg.location, 'package.json');
                        if (existsSync(depPkgJsonPath)) {
                            const depPkgJson = JSON.parse(readFileSync(depPkgJsonPath, 'utf8'));
                            if (depPkgJson.scripts && depPkgJson.scripts[script]) {
                                allNeededPackages.add(dep);
                                if (!filteredWorkspaces.find(p => p.name === dep)) {
                                    filteredWorkspaces.push(depPkg);
                                    changed = true;
                                    if (stream) {
                                        console.log(`[INFO] Including dependency ${dep} (required by ${pkgName})`);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    const sorted = topologicalSort(filteredWorkspaces, depGraph);
    filteredWorkspaces.length = 0;
    filteredWorkspaces.push(...sorted);
    if (stream) {
        console.log(`Building ${filteredWorkspaces.length} packages in dependency order:`);
        filteredWorkspaces.forEach((pkg, i) => console.log(`  ${i + 1}. ${pkg.name}`));
    }
}

if (parallel) {
    // Run in parallel
    const commands = filteredWorkspaces.map(pkg => {
        const cmd = `npm run ${script}${scriptArgs.length > 0 ? ' -- ' + scriptArgs.join(' ') : ''}`;
        return { pkg, cmd };
    });

    const results = commands.map(({ pkg, cmd }) => {
        try {
            if (stream) {
                console.log(`[${pkg.name}] Running: ${cmd}`);
            }
            execSync(cmd, {
                cwd: pkg.location,
                stdio: stream ? 'inherit' : 'pipe'
            });
            return { pkg, success: true };
        } catch (error) {
            if (stream) {
                console.error(`[${pkg.name}] Failed: ${error.message}`);
            }
            return { pkg, success: false, error };
        }
    });

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
        console.error(`\nFailed in ${failed.length} workspace(s):`);
        failed.forEach(({ pkg }) => console.error(`  - ${pkg.name}`));
        process.exit(1);
    }
} else {
    // Run sequentially
    for (const pkg of filteredWorkspaces) {
        const cmd = `npm run ${script}${scriptArgs.length > 0 ? ' -- ' + scriptArgs.join(' ') : ''}`;
        if (stream) {
            console.log(`[${pkg.name}] Running: ${cmd}`);
        }
        try {
            execSync(cmd, {
                cwd: pkg.location,
                stdio: stream ? 'inherit' : 'pipe'
            });
        } catch (error) {
            console.error(`Failed in ${pkg.name}`);
            if (error.stdout) {
                console.error('STDOUT:', error.stdout.toString());
            }
            if (error.stderr) {
                console.error('STDERR:', error.stderr.toString());
            }
            if (error.message) {
                console.error('Error:', error.message);
            }
            process.exit(1);
        }
    }
}
