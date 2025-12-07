# PowerShell script to check if ClangCL tools are installed
# Run this script to verify ClangCL installation before building native modules

Write-Host "Checking for ClangCL tools..." -ForegroundColor Cyan

$vsPaths = @(
    "D:\Program Files\Microsoft Visual Studio\2022\Community",
    "C:\Program Files\Microsoft Visual Studio\2022\Community",
    "C:\Program Files (x86)\Microsoft Visual Studio\2022\Community",
    "D:\Program Files\Microsoft Visual Studio\2022\Professional",
    "C:\Program Files\Microsoft Visual Studio\2022\Professional",
    "C:\Program Files (x86)\Microsoft Visual Studio\2022\Professional",
    "D:\Program Files\Microsoft Visual Studio\2022\Enterprise",
    "C:\Program Files\Microsoft Visual Studio\2022\Enterprise",
    "C:\Program Files (x86)\Microsoft Visual Studio\2022\Enterprise"
)

$found = $false
$clangPath = $null

foreach ($path in $vsPaths) {
    $llvmPath = Join-Path $path "VC\Tools\Llvm"
    if (Test-Path $llvmPath) {
        $found = $true
        $clangPath = $llvmPath
        Write-Host "✓ Found ClangCL tools at: $llvmPath" -ForegroundColor Green
        
        # Check for clang.exe
        $clangExe = Get-ChildItem -Path $llvmPath -Filter "clang.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($clangExe) {
            Write-Host "  ✓ clang.exe found at: $($clangExe.FullName)" -ForegroundColor Green
            
            # Get version
            try {
                $version = & $clangExe.FullName --version 2>&1 | Select-Object -First 1
                Write-Host "  Version: $version" -ForegroundColor Gray
            } catch {
                Write-Host "  Could not determine version" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ⚠ clang.exe not found in expected location" -ForegroundColor Yellow
        }
        break
    }
}

if (-not $found) {
    Write-Host "✗ ClangCL tools not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To install ClangCL tools:" -ForegroundColor Yellow
    Write-Host "1. Open Visual Studio Installer" -ForegroundColor White
    Write-Host "2. Click 'Modify' on Visual Studio 2022" -ForegroundColor White
    Write-Host "3. Go to 'Individual components' tab" -ForegroundColor White
    Write-Host "4. Search for 'Clang' and install:" -ForegroundColor White
    Write-Host "   - MSVC v143 - VS 2022 C++ ClangCL (x64/x86)" -ForegroundColor White
    Write-Host ""
    Write-Host "See INSTALL_CLANGCL.md for detailed instructions." -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "ClangCL tools are ready! You can now run 'npm install' to build native modules." -ForegroundColor Green
exit 0
