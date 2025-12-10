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

import { SymbolInformation, WorkspaceSymbolParams } from 'vscode-languageserver-protocol';
import { injectable, inject, postConstruct } from 'inversify';
import { ProblemManager } from '@theia/markers/lib/browser/problem/problem-manager.js';
import { URI } from '@theia/core/lib/common/uri.js';
import { MaybePromise, Mutable } from '@theia/core/lib/common/types.js';
import { Disposable } from '@theia/core/lib/common/disposable.js';
import { CancellationToken } from '@theia/core/lib/common/cancellation.js';
import { Language, LanguageService } from '@theia/core/lib/browser/language-service.js';
import { MonacoMarkerCollection } from './monaco-marker-collection.js';
import { ProtocolToMonacoConverter } from './protocol-to-monaco-converter.js';
import * as monaco from '@theia/monaco-editor-core';
import { FileStat } from '@theia/filesystem/lib/common/files.js';
import { FileStatNode } from '@theia/filesystem/lib/browser/index.js';
import { ILanguageService } from '@theia/monaco-editor-core/esm/vs/editor/common/languages/language.js';
import { StandaloneServices } from '@theia/monaco-editor-core/esm/vs/editor/standalone/browser/standaloneServices.js';

export type WorkspaceSymbolProvider = {
    provideWorkspaceSymbols(params: WorkspaceSymbolParams, token: CancellationToken): MaybePromise<SymbolInformation[] | undefined>;
    resolveWorkspaceSymbol?(symbol: SymbolInformation, token: CancellationToken): Thenable<SymbolInformation | undefined>
}

@injectable()
export class MonacoLanguages extends LanguageService {

    readonly workspaceSymbolProviders: WorkspaceSymbolProvider[] = [];

    protected readonly markers = new Map<string, MonacoMarkerCollection>();
    protected readonly icons = new Map<string, string>();

    @inject(ProblemManager) protected readonly problemManager: ProblemManager;
    @inject(ProtocolToMonacoConverter) protected readonly p2m: ProtocolToMonacoConverter;

    @postConstruct()
    protected init(): void {
        this.problemManager.onDidChangeMarkers((uri: URI) => this.updateMarkers(uri));
        monaco.editor.onDidCreateModel(model => this.updateModelMarkers(model));
    }

    updateMarkers(uri: URI): void {
        const markers = this.problemManager.findMarkers({ uri });
        const uriString = uri.toString();
        const collection = this.markers.get(uriString) || new MonacoMarkerCollection(uri, this.p2m);
        this.markers.set(uriString, collection);
        collection.updateMarkers(markers);
    }

    updateModelMarkers(model: monaco.editor.ITextModel): void {
        const uriString = model.uri.toString();
        const uri = new URI(uriString);
        const collection = this.markers.get(uriString) || new MonacoMarkerCollection(uri, this.p2m);
        this.markers.set(uriString, collection);
        collection.updateModelMarkers(model);
    }

    registerWorkspaceSymbolProvider(provider: WorkspaceSymbolProvider): Disposable {
        this.workspaceSymbolProviders.push(provider);
        return Disposable.create(() => {
            const index = this.workspaceSymbolProviders.indexOf(provider);
            if (index !== -1) {
                this.workspaceSymbolProviders.splice(index, 1);
            }
        });
    }

    override get languages(): Language[] {
        return [...this.mergeLanguages(monaco.languages.getLanguages()).values()];
    }

    override getLanguage(languageId: string): Language | undefined {
        return this.mergeLanguages(monaco.languages.getLanguages().filter(language => language.id === languageId)).get(languageId);
    }

    override detectLanguage(obj: unknown): Language | undefined {
        if (obj === undefined) {
            return undefined;
        }
        if (typeof obj === 'string') {
            return this.detectLanguageByIdOrName(obj) ?? this.detectLanguageByURI(new URI(obj));
        }
        if (obj instanceof URI) {
            return this.detectLanguageByURI(obj);
        }
        if (FileStat.is(obj) && obj.resource) {
            return this.detectLanguageByURI(obj.resource);
        }
        if (FileStatNode.is(obj)) {
            return this.detectLanguageByURI(obj.uri);
        }
        return undefined;
    }

    protected detectLanguageByIdOrName(obj: string): Language | undefined {
        const languageById = this.getLanguage(obj);
        if (languageById) {
            return languageById;
        }

        const languageId = this.getLanguageIdByLanguageName(obj);
        return languageId ? this.getLanguage(languageId) : undefined;
    }

    protected detectLanguageByURI(uri: URI): Language | undefined {
        const languageId = StandaloneServices.get(ILanguageService).guessLanguageIdByFilepathOrFirstLine(uri['codeUri']);
        return languageId ? this.getLanguage(languageId) : undefined;
    }

    getExtension(languageId: string): string | undefined {
        return this.getLanguage(languageId)?.extensions.values().next().value;
    }

    override registerIcon(languageId: string, iconClass: string): Disposable {
        this.icons.set(languageId, iconClass);
        (this as any).onDidChangeIconEmitter.fire({ languageId });
        return Disposable.create(() => {
            this.icons.delete(languageId);
            (this as any).onDidChangeIconEmitter.fire({ languageId });
        });
    }

    override getIcon(obj: unknown): string | undefined {
        const language = this.detectLanguage(obj);
        return language ? this.icons.get(language.id) : undefined;
    }

    getLanguageIdByLanguageName(languageName: string): string | undefined {
        return monaco.languages.getLanguages().find(language => language.aliases?.includes(languageName))?.id;
    }

    protected mergeLanguages(registered: monaco.languages.ILanguageExtensionPoint[]): Map<string, Mutable<Language>> {
        const languages = new Map<string, Mutable<Language>>();
        for (const { id, aliases, extensions, filenames } of registered) {
            const merged = languages.get(id) || {
                id,
                name: '',
                extensions: new Set(),
                filenames: new Set()
            };
            if (!merged.name && aliases && aliases.length) {
                merged.name = aliases[0];
            }
            if (extensions && extensions.length) {
                for (const extension of extensions) {
                    merged.extensions.add(extension);
                }
            }
            if (filenames && filenames.length) {
                for (const filename of filenames) {
                    merged.filenames.add(filename);
                }
            }
            languages.set(id, merged);
        }
        for (const [id, language] of languages) {
            if (!language.name) {
                language.name = id;
            }
        }
        return languages;
    }

}
