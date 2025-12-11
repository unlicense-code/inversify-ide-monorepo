// *****************************************************************************
// Copyright (C) 2018 Red Hat, Inc. and others.
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

import * as theia from '@theia/plugin';
import type * as monaco from '@theia/monaco-editor-core';
import { MarkdownString as MarkdownStringDTO } from '@theia/core/lib/common/markdown-rendering/index.js';
import { UriComponents } from './uri-components.js';
import { CompletionItemTag, DocumentPasteEditKind, SnippetString } from '../plugin/types-impl.js';
import { Event as TheiaEvent } from '@theia/core';
import { URI } from 'vscode-uri';
import { SerializedRegExp } from './plugin-api-rpc.js';

// Should contains internal Plugin API types

export type TextDocumentShowOptions = {
    /**
     * An optional selection to apply for the document in the editor.
     */
    selection?: Range;

    /**
     * An optional flag that when `true` will stop the editor from taking focus.
     */
    preserveFocus?: boolean;

    /**
     * An optional flag that controls if an editor-tab will be replaced
     * with the next editor or if it will be kept.
     */
    preview?: boolean;

    /**
     * Denotes a location of an editor in the window. Editors can be arranged in a grid
     * and each column represents one editor location in that grid by counting the editors
     * in order of their appearance.
     */
    viewColumn?: theia.ViewColumn;
}

export type Range = {
    /**
     * Line number on which the range starts (starts at 1).
     */
    readonly startLineNumber: number;
    /**
     * Column on which the range starts in line `startLineNumber` (starts at 1).
     */
    readonly startColumn: number;
    /**
     * Line number on which the range ends.
     */
    readonly endLineNumber: number;
    /**
     * Column on which the range ends in line `endLineNumber`.
     */
    readonly endColumn: number;
}

export type Position = {
    /**
     * line number (starts at 1)
     */
    readonly lineNumber: number,
    /**
     * column (starts at 1)
     */
    readonly column: number
}

export { MarkdownStringDTO as MarkdownString };

export type SerializedDocumentFilter = {
    $serialized: true;
    language?: string;
    scheme?: string;
    pattern?: theia.GlobPattern;
    notebookType?: string;
}

export enum CompletionTriggerKind {
    Invoke = 0,
    TriggerCharacter = 1,
    TriggerForIncompleteCompletions = 2
}

export type CompletionContext = {
    triggerKind: CompletionTriggerKind;
    triggerCharacter?: string;
}

export enum CompletionItemInsertTextRule {
    KeepWhitespace = 1,
    InsertAsSnippet = 4
}

export type Completion = {
    label: string | theia.CompletionItemLabel;
    label2?: string;
    kind: CompletionItemKind;
    detail?: string;
    documentation?: string | MarkdownStringDTO;
    sortText?: string;
    filterText?: string;
    preselect?: boolean;
    insertText: string;
    insertTextRules?: CompletionItemInsertTextRule;
    range?: Range | {
        insert: Range;
        replace: Range;
    };
    commitCharacters?: string[];
    additionalTextEdits?: SingleEditOperation[];
    command?: Command;
    tags?: CompletionItemTag[];
    /** @deprecated use tags instead. */
    deprecated?: boolean;
}

export type SingleEditOperation = {
    range: Range;
    text: string | null;
    /**
     * This indicates that this operation has "insert" semantics.
     * i.e. forceMoveMarkers = true => if `range` is collapsed, all markers at the position will be moved.
     */
    forceMoveMarkers?: boolean;
}

export type Command = {
    id: string;
    title: string;
    tooltip?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arguments?: any[];
}

export enum CompletionItemKind {
    Method = 0,
    Function = 1,
    Constructor = 2,
    Field = 3,
    Variable = 4,
    Class = 5,
    Struct = 6,
    Interface = 7,
    Module = 8,
    Property = 9,
    Event = 10,
    Operator = 11,
    Unit = 12,
    Value = 13,
    Constant = 14,
    Enum = 15,
    EnumMember = 16,
    Keyword = 17,
    Text = 18,
    Color = 19,
    File = 20,
    Reference = 21,
    Customcolor = 22,
    Folder = 23,
    TypeParameter = 24,
    User = 25,
    Issue = 26,
    Snippet = 27
}

export class IdObject {
    id?: number;
}
export type CompletionDto = Completion & {
    id: number;
    parentId: number;
}

export type CompletionResultDto = IdObject & {
    id: number;
    defaultRange: {
        insert: Range,
        replace: Range
    }
    completions: CompletionDto[];
    incomplete?: boolean;
}

export type MarkerData = {
    code?: string;
    severity: MarkerSeverity;
    message: string;
    source?: string;
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    relatedInformation?: RelatedInformation[];
    tags?: MarkerTag[];
}

export type RelatedInformation = {
    resource: string;
    message: string;
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
}

export enum MarkerSeverity {
    Hint = 1,
    Info = 2,
    Warning = 4,
    Error = 8,
}

export enum MarkerTag {
    Unnecessary = 1,
    Deprecated = 2,
}

export type ParameterInformation = {
    label: string | [number, number];
    documentation?: string | MarkdownStringDTO;
}

export type SignatureInformation = {
    label: string;
    documentation?: string | MarkdownStringDTO;
    parameters: ParameterInformation[];
    activeParameter?: number;
}

export type SignatureHelp = IdObject & {
    signatures: SignatureInformation[];
    activeSignature: number;
    activeParameter: number;
}

export type SignatureHelpContext = {
    triggerKind: theia.SignatureHelpTriggerKind;
    triggerCharacter?: string;
    isRetrigger: boolean;
    activeSignatureHelp?: SignatureHelp;
}

export type Hover = {
    contents: MarkdownStringDTO[];
    range?: Range;
}

export type HoverProvider = {
    provideHover(model: monaco.editor.ITextModel, position: monaco.Position, token: monaco.CancellationToken): Hover | undefined | Thenable<Hover | undefined>;
}

export type EvaluatableExpression = {
    range: Range;
    expression?: string;
}

export type EvaluatableExpressionProvider = {
    provideEvaluatableExpression(model: monaco.editor.ITextModel, position: monaco.Position,
        token: monaco.CancellationToken): EvaluatableExpression | undefined | Thenable<EvaluatableExpression | undefined>;
}

export type InlineValueContext = {
    frameId: number;
    stoppedLocation: Range;
}

export type InlineValueText = {
    type: 'text';
    range: Range;
    text: string;
}

export type InlineValueVariableLookup = {
    type: 'variable';
    range: Range;
    variableName?: string;
    caseSensitiveLookup: boolean;
}

export type InlineValueEvaluatableExpression = {
    type: 'expression';
    range: Range;
    expression?: string;
}

export type InlineValue = InlineValueText | InlineValueVariableLookup | InlineValueEvaluatableExpression;

export type InlineValuesProvider = {
    onDidChangeInlineValues?: TheiaEvent<void> | undefined;
    provideInlineValues(model: monaco.editor.ITextModel, viewPort: Range, context: InlineValueContext, token: monaco.CancellationToken):
        InlineValue[] | undefined | Thenable<InlineValue[] | undefined>;
}

export enum DocumentHighlightKind {
    Text = 0,
    Read = 1,
    Write = 2
}

export type DocumentHighlight = {
    range: Range;
    kind?: DocumentHighlightKind;
}

export type DocumentHighlightProvider = {
    provideDocumentHighlights(model: monaco.editor.ITextModel, position: monaco.Position, token: monaco.CancellationToken): DocumentHighlight[] | undefined;
}

export type FormattingOptions = {
    tabSize: number;
    insertSpaces: boolean;
}

export type TextEdit = {
    range: Range;
    text: string;
    eol?: monaco.editor.EndOfLineSequence;
}

export type DocumentDropEdit = {
    insertText: string | SnippetString;
    additionalEdit?: WorkspaceEdit;
}

export type DocumentDropEditProviderMetadata = {
    readonly providedDropEditKinds?: readonly DocumentPasteEditKind[];
    readonly dropMimeTypes: readonly string[];
}

export type DataTransferFileDTO = {
    readonly id: string;
    readonly name: string;
    readonly uri?: UriComponents;
}

export type DataTransferItemDTO = {
    readonly asString: string;
    readonly fileData: DataTransferFileDTO | undefined;
    readonly uriListData?: ReadonlyArray<string | UriComponents>;
}

export type DataTransferDTO = {
    readonly items: Array<[/* type */string, DataTransferItemDTO]>;
}

export type Location = {
    uri: UriComponents;
    range: Range;
}

export type Definition = Location | Location[] | LocationLink[];

export type LocationLink = {
    uri: UriComponents;
    range: Range;
    originSelectionRange?: Range;
    targetSelectionRange?: Range;
}

export type DefinitionProvider = {
    provideDefinition(model: monaco.editor.ITextModel, position: monaco.Position, token: monaco.CancellationToken): Definition | undefined;
}

export type DeclarationProvider = {
    provideDeclaration(model: monaco.editor.ITextModel, position: monaco.Position, token: monaco.CancellationToken): Definition | undefined;
}

export type ReferenceContext = {

    /**
     * Include the declaration of the current symbol.
     */
    includeDeclaration: boolean;
}

export type CacheId = number;
export type ChainedCacheId = [CacheId, CacheId];

export type CachedSessionItem<T> = T & { cacheId?: ChainedCacheId };
export type CachedSession<T> = T & { cacheId?: CacheId };

export type DocumentLink = {
    cacheId?: ChainedCacheId,
    range: Range;
    url?: UriComponents | string;
    tooltip?: string;
}

export type DocumentLinkProvider = {
    provideLinks(model: monaco.editor.ITextModel, token: monaco.CancellationToken): DocumentLink[] | undefined | PromiseLike<DocumentLink[] | undefined>;
    resolveLink?: (link: DocumentLink, token: monaco.CancellationToken) => DocumentLink | PromiseLike<DocumentLink[]>;
}

export type CodeLensSymbol = {
    range: Range;
    command?: Command;
}

export type CodeAction = {
    cacheId: number;
    title: string;
    command?: Command;
    edit?: WorkspaceEdit;
    diagnostics?: MarkerData[];
    kind?: string;
    disabled?: { reason: string };
    isPreferred?: boolean;
}

export enum CodeActionTriggerKind {
    Invoke = 1,
    Automatic = 2,
}

export type CodeActionContext = {
    only?: string;
    trigger: CodeActionTriggerKind
}

export type CodeActionProviderDocumentation = ReadonlyArray<{ command: Command, kind: string }>;

export type CodeActionProvider = {
    provideCodeActions(
        model: monaco.editor.ITextModel,
        range: Range | Selection,
        context: monaco.languages.CodeActionContext,
        token: monaco.CancellationToken
    ): CodeAction[] | PromiseLike<CodeAction[]>;

    providedCodeActionKinds?: string[];
}

// copied from https://github.com/microsoft/vscode/blob/b165e20587dd0797f37251515bc9e4dbe513ede8/src/vs/editor/common/modes.ts
export type WorkspaceEditMetadata = {
    needsConfirmation: boolean;
    label: string;
    description?: string;
    iconPath?: UriComponents | {
        id: string;
    } | {
        light: UriComponents;
        dark: UriComponents;
    };
}

export type WorkspaceFileEdit = {
    newResource?: UriComponents;
    oldResource?: UriComponents;
    options?: { overwrite?: boolean, ignoreIfNotExists?: boolean, ignoreIfExists?: boolean, recursive?: boolean };
    metadata?: WorkspaceEditMetadata;
}

export type WorkspaceTextEdit = {
    resource: UriComponents;
    modelVersionId?: number;
    textEdit: TextEdit;
    metadata?: WorkspaceEditMetadata;
}

export type WorkspaceEdit = {
    edits: Array<WorkspaceTextEdit | WorkspaceFileEdit>;
}

export enum SymbolKind {
    File = 0,
    Module = 1,
    Namespace = 2,
    Package = 3,
    Class = 4,
    Method = 5,
    Property = 6,
    Field = 7,
    Constructor = 8,
    Enum = 9,
    Interface = 10,
    Function = 11,
    Variable = 12,
    Constant = 13,
    String = 14,
    Number = 15,
    Boolean = 16,
    Array = 17,
    Object = 18,
    Key = 19,
    Null = 20,
    EnumMember = 21,
    Struct = 22,
    Event = 23,
    Operator = 24,
    TypeParameter = 25
}

export enum SymbolTag {
    Deprecated = 1
}

export type DocumentSymbol = {
    name: string;
    detail: string;
    kind: SymbolKind;
    tags: ReadonlyArray<SymbolTag>;
    containerName?: string;
    range: Range;
    selectionRange: Range;
    children?: DocumentSymbol[];
}

export type WorkspaceRootsChangeEvent = {
    roots: string[];
}

export type WorkspaceFolder = {
    uri: UriComponents;
    name: string;
    index: number;
}

export type Breakpoint = {
    readonly id: string;
    readonly enabled: boolean;
    readonly condition?: string;
    readonly hitCondition?: string;
    readonly logMessage?: string;
    readonly location?: Location;
    readonly functionName?: string;
}

export type WorkspaceSymbolParams = {
    query: string
}

export type FoldingContext = {
}

export type FoldingRange = {
    start: number;
    end: number;
    kind?: FoldingRangeKind;
}

export class FoldingRangeKind {
    static readonly Comment = new FoldingRangeKind('comment');
    static readonly Imports = new FoldingRangeKind('imports');
    static readonly Region = new FoldingRangeKind('region');
    public constructor(public value: string) { }
}

export type SelectionRange = {
    range: Range;
}

export type Color = {
    readonly red: number;
    readonly green: number;
    readonly blue: number;
    readonly alpha: number;
}

export type ColorPresentation = {
    label: string;
    textEdit?: TextEdit;
    additionalTextEdits?: TextEdit[];
}

export type ColorInformation = {
    range: Range;
    color: Color;
}

export type DocumentColorProvider = {
    provideDocumentColors(model: monaco.editor.ITextModel): PromiseLike<ColorInformation[]>;
    provideColorPresentations(model: monaco.editor.ITextModel, colorInfo: ColorInformation): PromiseLike<ColorPresentation[]>;
}

export type Rejection = {
    rejectReason?: string;
}

export type RenameLocation = {
    range: Range;
    text: string;
}

export class HierarchyItem {
    _sessionId?: string;
    _itemId?: string;

    kind: SymbolKind;
    tags?: readonly SymbolTag[];
    name: string;
    detail?: string;
    uri: UriComponents;
    range: Range;
    selectionRange: Range;
}

export class TypeHierarchyItem extends HierarchyItem { }

export type CallHierarchyItem = HierarchyItem & {
    data?: unknown;
}

export type CallHierarchyIncomingCall = {
    from: CallHierarchyItem;
    fromRanges: Range[];
}

export type CallHierarchyOutgoingCall = {
    to: CallHierarchyItem;
    fromRanges: Range[];
}

export type LinkedEditingRanges = {
    ranges: Range[];
    wordPattern?: SerializedRegExp;
}

export type SearchInWorkspaceResult = {
    root: string;
    fileUri: string;
    matches: SearchMatch[];
}

export type SearchMatch = {
    line: number;
    character: number;
    length: number;
    lineText: string | LinePreview;

}
export type LinePreview = {
    text: string;
    character: number;
}

export type AuthenticationSession = theia.AuthenticationSession & {
}

export type AuthenticationSessionsChangeEvent = theia.AuthenticationProviderAuthenticationSessionsChangeEvent & {
}

export type AuthenticationProviderInformation = theia.AuthenticationProviderInformation & {
}

export type CommentOptions = {
    /**
     * An optional string to show on the comment input box when it's collapsed.
     */
    prompt?: string;

    /**
     * An optional string to show as placeholder in the comment input box when it's focused.
     */
    placeHolder?: string;
}

export enum CommentMode {
    Editing = 0,
    Preview = 1
}

export type Comment = {
    readonly uniqueIdInThread: number;
    readonly body: MarkdownStringDTO;
    readonly userName: string;
    readonly userIconPath?: string;
    readonly contextValue?: string;
    readonly label?: string;
    readonly mode?: CommentMode;
    /** Timestamp serialized as ISO date string via Date.prototype.toISOString */
    readonly timestamp?: string;
}

export enum CommentThreadState {
    Unresolved = 0,
    Resolved = 1
}

export enum CommentThreadCollapsibleState {
    /**
     * Determines an item is collapsed
     */
    Collapsed = 0,
    /**
     * Determines an item is expanded
     */
    Expanded = 1
}

export type CommentInput = {
    value: string;
    uri: URI;
}

export type CommentThread = {
    commentThreadHandle: number;
    controllerHandle: number;
    extensionId?: string;
    threadId: string;
    resource: string | null;
    range: Range | undefined;
    label: string | undefined;
    contextValue: string | undefined;
    comments: Comment[] | undefined;
    onDidChangeComments: TheiaEvent<Comment[] | undefined>;
    collapsibleState?: CommentThreadCollapsibleState;
    state?: CommentThreadState;
    input?: CommentInput;
    onDidChangeInput: TheiaEvent<CommentInput | undefined>;
    onDidChangeRange: TheiaEvent<Range | undefined>;
    onDidChangeLabel: TheiaEvent<string | undefined>;
    onDidChangeState: TheiaEvent<CommentThreadState | undefined>;
    onDidChangeCollapsibleState: TheiaEvent<CommentThreadCollapsibleState | undefined>;
    isDisposed: boolean;
    canReply: boolean | theia.CommentAuthorInformation;
    onDidChangeCanReply: TheiaEvent<boolean | theia.CommentAuthorInformation>;
}

export type CommentThreadChangedEventMain = CommentThreadChangedEvent & {
    owner: string;
}

export type CommentThreadChangedEvent = {
    /**
     * Added comment threads.
     */
    readonly added: CommentThread[];

    /**
     * Removed comment threads.
     */
    readonly removed: CommentThread[];

    /**
     * Changed comment threads.
     */
    readonly changed: CommentThread[];
}

export type CommentingRanges = {
    readonly resource: URI;
    ranges: Range[];
    fileComments: boolean;
}

export type CommentInfo = {
    extensionId?: string;
    threads: CommentThread[];
    commentingRanges: CommentingRanges;
}

export type ProvidedTerminalLink = theia.TerminalLink & {
    providerId: string
}

export type InlayHintLabelPart = {
    label: string;
    tooltip?: string | MarkdownStringDTO;
    location?: Location;
    command?: Command;
}

export type InlayHint = {
    position: { lineNumber: number, column: number };
    label: string | InlayHintLabelPart[];
    tooltip?: string | MarkdownStringDTO | undefined;
    kind?: InlayHintKind;
    textEdits?: TextEdit[];
    paddingLeft?: boolean;
    paddingRight?: boolean;
}

export enum InlayHintKind {
    Type = 1,
    Parameter = 2,
}

export type InlayHintsProvider = {
    onDidChangeInlayHints?: TheiaEvent<void> | undefined;
    provideInlayHints(model: monaco.editor.ITextModel, range: Range, token: monaco.CancellationToken): InlayHint[] | undefined | Thenable<InlayHint[] | undefined>;
    resolveInlayHint?(hint: InlayHint, token: monaco.CancellationToken): InlayHint[] | undefined | Thenable<InlayHint[] | undefined>;
}

/**
 * How an {@link InlineCompletionsProvider inline completion provider} was triggered.
 */
export enum InlineCompletionTriggerKind {
    /**
     * Completion was triggered automatically while editing.
     * It is sufficient to return a single completion item in this case.
     */
    Automatic = 0,

    /**
     * Completion was triggered explicitly by a user gesture.
     * Return multiple completion items to enable cycling through them.
     */
    Explicit = 1,
}

export type InlineCompletionContext = {
    /**
     * How the completion was triggered.
     */
    readonly triggerKind: InlineCompletionTriggerKind;

    readonly selectedSuggestionInfo: SelectedSuggestionInfo | undefined;
}

export type SelectedSuggestionInfo = {
    range: Range;
    text: string;
    isSnippetText: boolean;
    completionKind: CompletionItemKind;
}

export type InlineCompletion = {
    /**
     * The text to insert.
     * If the text contains a line break, the range must end at the end of a line.
     * If existing text should be replaced, the existing text must be a prefix of the text to insert.
     *
     * The text can also be a snippet. In that case, a preview with default parameters is shown.
     * When accepting the suggestion, the full snippet is inserted.
     */
    readonly insertText: string | { snippet: string };

    /**
     * A text that is used to decide if this inline completion should be shown.
     * An inline completion is shown if the text to replace is a subword of the filter text.
     */
    readonly filterText?: string;

    /**
     * An optional array of additional text edits that are applied when
     * selecting this completion. Edits must not overlap with the main edit
     * nor with themselves.
     */
    readonly additionalTextEdits?: SingleEditOperation[];

    /**
     * The range to replace.
     * Must begin and end on the same line.
     */
    readonly range?: Range;

    readonly command?: Command;

    /**
     * If set to `true`, unopened closing brackets are removed and unclosed opening brackets are closed.
     * Defaults to `false`.
     */
    readonly completeBracketPairs?: boolean;
}

export type InlineCompletions<TItem extends InlineCompletion = InlineCompletion> = {
    readonly items: readonly TItem[];
}

export type InlineCompletionsProvider<T extends InlineCompletions = InlineCompletions> = {
    provideInlineCompletions(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: InlineCompletionContext,
        token: monaco.CancellationToken
    ): T[] | undefined | Thenable<T[] | undefined>;

    /**
     * Will be called when an item is shown.
     */
    handleItemDidShow?(completions: T, item: T['items'][number]): void;

    /**
     * Will be called when a completions list is no longer in use and can be garbage-collected.
     */
    freeInlineCompletions(completions: T): void;
}

export type DebugStackFrameDTO = {
    readonly sessionId: string,
    readonly frameId: number,
    readonly threadId: number
}

export type DebugThreadDTO = {
    readonly sessionId: string,
    readonly threadId: number
}
