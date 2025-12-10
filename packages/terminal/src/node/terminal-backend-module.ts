// *****************************************************************************
// Copyright (C) 2026 AwesomeOS and Contributors
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

import { ContainerModule, Container, interfaces } from 'inversify';
import { TerminalBackendContribution } from './terminal-backend-contribution.js';
import { ConnectionHandler, RpcConnectionHandler, RpcProxy } from '@theia/core/lib/common/messaging/index.js';
import { ShellProcess, ShellProcessFactory, ShellProcessOptions } from './shell-process.js';
import { ITerminalServer, terminalPath } from '../common/terminal-protocol.js';
import { IBaseTerminalClient, DispatchingBaseTerminalClient, IBaseTerminalServer } from '../common/base-terminal-protocol.js';
import { TerminalServer } from './terminal-server.js';
import { IShellTerminalServer, shellTerminalPath } from '../common/shell-terminal-protocol.js';
import { ShellTerminalServer } from '../node/shell-terminal-server.js';
import { TerminalWatcher } from '../common/terminal-watcher.js';
import { MessagingService } from '@theia/core/lib/node/messaging/messaging-service.js';
import { bindTerminalPreferences } from '../common/terminal-preferences.js';

export function bindTerminalServer(bind: interfaces.Bind, { path, identifier, constructor }: {
    path: string,
    identifier: interfaces.ServiceIdentifier<IBaseTerminalServer>,
    constructor: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new(...args: any[]): IBaseTerminalServer;
    }
}): void {
    const dispatchingClient = new DispatchingBaseTerminalClient();
    bind<IBaseTerminalServer>(identifier).to(constructor).inSingletonScope().onActivation((context, terminalServer) => {
        (terminalServer as any).setClient(dispatchingClient);
        dispatchingClient.push(context.container.get(TerminalWatcher).getTerminalClient());
        (terminalServer as any).setClient = () => {
            throw new Error('use TerminalWatcher');
        };
        return terminalServer;
    });
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new RpcConnectionHandler<IBaseTerminalClient>(path, (client: RpcProxy<IBaseTerminalClient>) => {
            const disposable = dispatchingClient.push(client);
            client.onDidCloseConnection(() => disposable.dispose());
            return ctx.container.get(identifier);
        })
    ).inSingletonScope();
}

export default new ContainerModule(bind => {
    bind(MessagingService.Contribution).to(TerminalBackendContribution).inSingletonScope();

    bind(ShellProcess).toSelf().inTransientScope();
    bind(ShellProcessFactory).toFactory(ctx =>
        (options: ShellProcessOptions) => {
            const child = new Container({ defaultScope: 'Singleton' });
            child.parent = ctx.container;
            child.bind(ShellProcessOptions).toConstantValue(options);
            return child.get(ShellProcess);
        }
    );

    bind(TerminalWatcher).toSelf().inSingletonScope();
    bindTerminalServer(bind, {
        path: terminalPath,
        identifier: ITerminalServer,
        constructor: TerminalServer
    });
    bindTerminalServer(bind, {
        path: shellTerminalPath,
        identifier: IShellTerminalServer,
        constructor: ShellTerminalServer
    });
    bindTerminalPreferences(bind);
});
