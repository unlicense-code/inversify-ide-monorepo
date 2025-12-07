/********************************************************************************
 * Copyright (C) 2022 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 ********************************************************************************/

import { parse as parseUrl, Url } from 'url';
import HttpProxyAgentModule = require('http-proxy-agent');
import HttpsProxyAgentModule = require('https-proxy-agent');

const HttpProxyAgent = HttpProxyAgentModule as any;
const HttpsProxyAgent = HttpsProxyAgentModule as any;

export type ProxyAgent = InstanceType<typeof HttpProxyAgent> | InstanceType<typeof HttpsProxyAgent>;

function getSystemProxyURI(requestURL: Url, env: NodeJS.ProcessEnv): string | undefined {
    if (requestURL.protocol === 'http:') {
        return env.HTTP_PROXY || env.http_proxy;
    } else if (requestURL.protocol === 'https:') {
        return env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy;
    }

    return undefined;
}

export interface ProxySettings {
    proxyUrl?: string;
    strictSSL?: boolean;
}

export function getProxyAgent(rawRequestURL: string, env: NodeJS.ProcessEnv, options: ProxySettings = {}): ProxyAgent | undefined {
    const requestURL = parseUrl(rawRequestURL);
    const proxyURL = options.proxyUrl || getSystemProxyURI(requestURL, env);

    if (!proxyURL) {
        return undefined;
    }

    const proxyEndpoint = parseUrl(proxyURL);

    if (!/^https?:$/.test(proxyEndpoint.protocol || '')) {
        return undefined;
    }

    // Build proxy URL string (proxyEndpoint already has the full URL from parseUrl)
    const proxyUrl = proxyURL;
    
    const agentOptions: any = {
        rejectUnauthorized: !!options.strictSSL,
    };

    if (requestURL.protocol === 'http:') {
        return new HttpProxyAgent(proxyUrl, agentOptions);
    } else {
        return new HttpsProxyAgent(proxyUrl, agentOptions);
    }
}
