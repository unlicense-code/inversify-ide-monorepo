/**
 * This file can be edited to customize rollup configuration.
 * To reset delete this file and rerun theia build again.
 */
// @ts-check
const configs = require('./gen-rollup.config.js');
const nodeConfig = require('./gen-rollup.node.config.js');

module.exports = [
    ...configs,
    nodeConfig
];
