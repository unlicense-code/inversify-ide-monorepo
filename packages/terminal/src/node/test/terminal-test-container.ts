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
import { Container, ContainerModule } from 'inversify';
import { bindLogger } from '@theia/core/lib/node/logger-backend-module.js';
import { backendApplicationModule } from '@theia/core/lib/node/backend-application-module.js';
import * as processBackendModuleNS from '@theia/process/lib/node/process-backend-module.js';
import { messagingBackendModule } from '@theia/core/lib/node/messaging/messaging-backend-module.js';
import terminalBackendModule from '../terminal-backend-module.js';
import { ApplicationPackage } from '@theia/application-package';
import { ProcessUtils } from '@theia/core/lib/node/process-utils.js';

const processBackendModule = processBackendModuleNS.default as unknown as ContainerModule;

export function createTerminalTestContainer(): Container {
    const container = new Container();

    container.load(backendApplicationModule);
    container.rebind(ApplicationPackage).toConstantValue({} as ApplicationPackage);
    container.rebind(ProcessUtils).toConstantValue(new class extends ProcessUtils {
        override terminateProcessTree(): void { }
    });

    bindLogger(container.bind.bind(container));
    container.load(messagingBackendModule);
    container.load(processBackendModule as ContainerModule);
    container.load(terminalBackendModule);
    return container;
}
