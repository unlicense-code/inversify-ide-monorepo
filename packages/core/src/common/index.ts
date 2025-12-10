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

export { environment } from '@theia/application-package/lib/environment.js';
export * from './application-error.js';
export * from './cancellation.js';
export * from './command.js';
export * from './contribution-filter/index.js';
export * from './contribution-provider.js';
export * from './contribution-collection.js';
export * from './core-preferences.js';
export * from './service-registry.js';
export * from './disposable.js';
export * from './env-variables/index.js';
export * from './event.js';
export * from './inversify-utils.js';
export * from './listener.js';
export * from './logger.js';
export * from './lsp-types.js';
export * from './menu/index.js';
export * from './message-rpc/index.js';
export { MockLogger } from './test/mock-logger.js';
export * from './message-service.js';
export * from './message-service-protocol.js';
export * from './messaging/index.js';
export * from './nls.js';
export * from './numbers.js';
export * from './objects.js';
export * from './os.js';
export * from './path.js';
export * from './performance/index.js';
export * from './preferences/index.js';
export * from './progress-service.js';
export * from './progress-service-protocol.js';
export * from './quick-pick-service.js';
export * from './reference.js';
export * from './resource.js';
export * from './selection.js';
export * from './selection-service.js';
export * from './strings.js';
export * from './telemetry.js';
export * from './tree-preference.js';
export * from './uri-command-handler.js';
// Export types.js but exclude Deferred type to avoid conflict with Deferred class
export type { MaybeArray, MaybeNull, MaybePromise, MaybeUndefined, Mutable, RecursivePartial, RecursiveReadonly } from './types.js';
export { ArrayUtils, Prioritizeable, isBoolean, isString, isNumber, isError, isErrorLike, isFunction, isEmptyObject, isObject, isUndefined, isArray, isStringArray, nullToUndefined, unreachable, isDefined, isUndefinedOrNull } from './types.js';
export { default as URI } from './uri.js';
export * from './uuid.js';
export * from './view-column.js';
export * from './version.js';
export * from './buffer.js';
export * from './stream.js';
export * from './encoding-service.js';
export { Deferred, timeout, retry } from './promise-util.js';
export * from './markdown-rendering/markdown-string.js';
