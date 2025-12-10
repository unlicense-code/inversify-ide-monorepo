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

import { injectable, inject, named } from 'inversify';
import * as http from 'http';
import * as https from 'https';
import * as express from 'express';
import { ContributionProvider } from '@theia/core/lib/common/index.js';
import { BackendApplicationContribution } from '@theia/core/lib/node/index.js';
import { MetricsContribution } from './metrics-contribution.js';

@injectable()
export class MetricsBackendApplicationContribution implements BackendApplicationContribution {
    static ENDPOINT = '/metrics';
    constructor(
        @inject(ContributionProvider) @named(MetricsContribution)
        protected readonly metricsProviders: ContributionProvider<MetricsContribution>
    ) {
    }

    configure(app: express.Application): void {
        app.get(MetricsBackendApplicationContribution.ENDPOINT, (req: any, res: any) => {
            const lastMetrics = this.fetchMetricsFromProviders();
            res.send(lastMetrics);
        });
    }

    onStart(server: http.Server | https.Server): void {
        this.metricsProviders.getContributions().forEach(contribution => {
            contribution.startCollecting();
        });
    }

    fetchMetricsFromProviders(): string {
        return this.metricsProviders.getContributions().reduce((total, contribution) =>
            total += contribution.getMetrics() + '\n', '');
    }
}
