/**
 * This file can be edited to customize rollup configuration.
 * To reset delete this file and rerun theia build again.
 */
// @ts-check
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const configs = require('./gen-rollup.config.cjs');
const nodeConfig = require('./gen-rollup.node.config.cjs');

export default [
    ...configs,
    nodeConfig
];
