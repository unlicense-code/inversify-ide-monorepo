# Fix all @theia/* imports by adding .js extensions
$packagesDir = "packages"

# Get all unique import paths from errors that need .js extension
$importsToFix = @(
    "@theia/core/lib/common/severity",
    "@theia/core/lib/common/event",
    "@theia/core/lib/common/preferences/preference-provider",
    "@theia/core/lib/common/preferences/preference-configurations",
    "@theia/core/lib/common/preferences/preference-scope",
    "@theia/core/lib/browser/json-schema-store",
    "@theia/core/lib/common/json-schema",
    "@theia/variable-resolver/lib/browser/variable-input-schema",
    "@theia/core/lib/common/quick-pick-service",
    "@theia/workspace/lib/browser/workspace-service",
    "@theia/workspace/lib/browser/workspace-variable-contribution",
    "@theia/filesystem/lib/common/filesystem-watcher-protocol",
    "@theia/core/lib/common/application-error",
    "@theia/terminal/lib/browser/base/terminal-widget",
    "@theia/terminal/lib/browser/terminal-widget-impl",
    "@theia/terminal/lib/browser/base/terminal-service",
    "@theia/core/lib/common/application-protocol",
    "@theia/core/lib/common/message-service",
    "@theia/core/lib/browser/label-provider",
    "@theia/markers/lib/browser/problem/problem-manager",
    "@theia/markers/lib/browser/problem/problem-widget",
    "@theia/terminal/lib/common/shell-terminal-protocol",
    "@theia/core/lib/browser/quick-input/quick-input-service",
    "@theia/monaco-editor-core/esm/vs/platform/quickinput/browser/pickerQuickAccess",
    "@theia/core/lib/browser/widget-manager",
    "@theia/terminal/lib/browser/terminal-frontend-contribution",
    "@theia/core/lib/browser/quick-input/quick-access",
    "@theia/process/lib/common/shell-quoting",
    "@theia/terminal/lib/node/shell-process",
    "@theia/core/lib/common/os",
    "@theia/core/lib/common/numbers",
    "@theia/core/lib/node/logger-backend-module",
    "@theia/core/lib/node/backend-application-module",
    "@theia/process/lib/node/process-backend-module",
    "@theia/terminal/lib/node/terminal-backend-module",
    "@theia/filesystem/lib/node/filesystem-backend-module",
    "@theia/workspace/lib/node/workspace-backend-module",
    "@theia/core/lib/node/messaging/messaging-backend-module",
    "@theia/core/lib/node/process-utils",
    "@theia/terminal/lib/common/terminal-protocol",
    "@theia/core/lib/node/messaging/test/test-web-socket-channel",
    "@theia/terminal/lib/node/buffering-stream",
    "@theia/core/lib/node/backend-application-config-provider",
    "@theia/core/lib/browser/widgets/select-component",
    "@theia/core/lib/common/strings",
    "@theia/core/lib/browser/clipboard-service",
    "@theia/core/lib/browser/messaging/service-connection-provider",
    "@theia/core/lib/browser/frontend-application-bindings",
    "@theia/core/lib/common/encoding-service",
    "@theia/filesystem/lib/node/disk-file-system-provider",
    "@theia/core/lib/common/encodings",
    "@theia/core/lib/node/cli",
    "@theia/core/lib/browser/widgets/alert-message",
    "@theia/core/lib/browser/icon-theme-service",
    "@theia/core/lib/browser/color-registry",
    "@theia/core/lib/browser/decorations-service",
    "@theia/monaco/lib/browser/monaco-diff-editor",
    "@theia/monaco/lib/browser/monaco-editor-provider",
    "@theia/monaco/lib/browser/monaco-editor-peek-view-widget",
    "@theia/core/lib/common/color",
    "@theia/core/lib/common/theme",
    "@theia/core/lib/browser/shell/shell-layout-restorer",
    "@theia/core/lib/browser/tree/tree",
    "@theia/core/lib/common/selection-service",
    "@theia/core/lib/common/selection-command-handler",
    "@theia/core/lib/common/selection",
    "@theia/core/lib/browser/tree/tree-label-provider",
    "@theia/editor/lib/common/language-selector",
    "@theia/core/lib/common/cancellation",
    "@theia/core/lib/common/uuid",
    "@theia/editor/lib/browser/editor",
    "@theia/core/lib/browser/tree/tree-model",
    "@theia/core/lib/browser/keybinding",
    "@theia/core/lib/common/command",
    "@theia/editor/lib/browser/editor-menu",
    "@theia/core/lib/common/diff",
    "@theia/monaco/lib/browser/monaco-to-protocol-converter",
    "@theia/core/lib/browser/label-parser",
    "@theia/monaco/lib/browser/monaco-editor-zone-widget",
    "@theia/core/lib/browser/language-service",
    "@theia/workspace/lib/node/default-workspace-server",
    "@theia/filesystem/lib/browser/file-dialog/file-dialog-service",
    "@theia/monaco-editor-core/esm/vs/base/common/lifecycle"
)

Write-Host "Fixing imports in $packagesDir..."
$files = Get-ChildItem -Path $packagesDir -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch 'node_modules|lib|\.git' }

$totalFixed = 0
$filesFixed = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    $fileFixed = $false
    
    foreach ($import in $importsToFix) {
        # Fix single quotes
        $pattern1 = "from '$import'"
        $replacement1 = "from '$import.js'"
        if ($content -match [regex]::Escape($pattern1)) {
            $content = $content -replace [regex]::Escape($pattern1), $replacement1
            $fileFixed = $true
            $totalFixed++
        }
        
        # Fix double quotes
        $pattern2 = "from `"$import`""
        $replacement2 = "from `"$import.js`""
        if ($content -match [regex]::Escape($pattern2)) {
            $content = $content -replace [regex]::Escape($pattern2), $replacement2
            $fileFixed = $true
            $totalFixed++
        }
    }
    
    if ($fileFixed) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $filesFixed++
        Write-Host "Fixed: $($file.FullName)"
    }
}

Write-Host "`nFixed $totalFixed imports in $filesFixed files"
