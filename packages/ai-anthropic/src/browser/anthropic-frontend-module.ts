// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
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

import { ServiceRegistry } from '@theia/core/lib/common/service-registry';
import { AnthropicPreferencesSchema } from '../common/anthropic-preferences';
import { RemoteConnectionProvider, ServiceConnectionProvider } from '@theia/core/lib/browser';
import { AnthropicFrontendApplicationContribution } from './anthropic-frontend-application-contribution';
import { ANTHROPIC_LANGUAGE_MODELS_MANAGER_PATH, AnthropicLanguageModelsManager } from '../common';
import { PreferenceContribution, PreferenceService } from '@theia/core';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { AICorePreferences } from '@theia/ai-core/lib/common/ai-core-preferences';

export function initializeAnthropicFrontendModule(registry: ServiceRegistry): void {
    // Register preference contribution
    registry.registerSingleton(PreferenceContribution, () => ({ schema: AnthropicPreferencesSchema }));

    // Register AnthropicLanguageModelsManager (dynamic value)
    registry.registerSingleton(AnthropicLanguageModelsManager, () => {
        const provider = registry.get<ServiceConnectionProvider>(RemoteConnectionProvider);
        return provider.createProxy<AnthropicLanguageModelsManager>(ANTHROPIC_LANGUAGE_MODELS_MANAGER_PATH);
    });

    // Register AnthropicFrontendApplicationContribution
    registry.registerSingleton(AnthropicFrontendApplicationContribution, () => {
        const preferenceService = registry.get(PreferenceService);
        const manager = registry.get(AnthropicLanguageModelsManager);
        const aiCorePreferences = registry.get(AICorePreferences);
        return new AnthropicFrontendApplicationContribution(preferenceService, manager, aiCorePreferences);
    });

    // Register as FrontendApplicationContribution
    registry.registerSingleton(FrontendApplicationContribution, () => 
        registry.get(AnthropicFrontendApplicationContribution)
    );
}
