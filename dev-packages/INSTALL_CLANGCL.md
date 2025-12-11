# Installing ClangCL Tools for Native Module Builds

This guide will help you install the ClangCL build tools required for building native Node.js modules like `native-keymap` in Electron projects.

## Prerequisites
- Visual Studio 2022 or 2026+ Community (or Professional/Enterprise) installed
- Visual Studio Installer installed

## Installation Steps

### Option 1: Using Visual Studio Installer (Recommended)

1. **Open Visual Studio Installer**
   - Press `Win + S` and search for "Visual Studio Installer"
   - Or navigate to: `C:\Program Files (x86)\Microsoft Visual Studio\Installer\vs_installer.exe`

2. **Modify Visual Studio 2026**
   - Find "Visual Studio 2026 Community" (or your edition)
   - Click the **"Modify"** button

3. **Install ClangCL Components**
   - Go to the **"Individual components"** tab
   - In the search box, type: `Clang`
   - Check the following components:
     - ✅ **MSVC v143 - VS 2022 C++ ClangCL (x64/x86)** (or latest version)
     - ✅ **C++ Clang tools for Windows** (optional but recommended)
     - ✅ MSVC-Version version_numbers Libs for Spectre [(x86 und x64) | (ARM) | (ARM64)]
     - ✅ Visual C++ ATL für [(x86/x64) | ARM | ARM64] mit Spectre Mitigations
     - ✅ Visual C++ MFC für [x86/x64 | ARM | ARM64] mit Spectre Mitigations
   - Click **"Modify"** to install

4. **Wait for Installation**
   - The installer will download and install the components
   - This may take several minutes depending on your internet connection

### Option 2: Using Command Line

Option 2: Using Command Line
If you prefer command line, you can use the Visual Studio Installer CLI:



# Modify VS 2022 Community to add ClangCL and Spectre components



If you prefer command line, you can use the Visual Studio Installer CLI:
Note: Adjust the --installPath to match your Visual Studio installation location.

```powershell
# Find the installer path
$installerPath = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vs_installer.exe"

# Modify VS 2022 Community to add ClangCL
& $installerPath modify `
  --installPath "D:\Program Files\Microsoft Visual Studio\2022\Community" `
  --add Microsoft.VisualStudio.Component.VC.Tools.ClangCL `
  --add Microsoft.VisualStudio.Component.VC.Llvm.Clang `
  --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64.Spectre `
  --add Microsoft.VisualStudio.Component.VC.ATL.Spectre `
  --add Microsoft.VisualStudio.Component.VC.MFC.Spectre `
  --passive --norestart
```

**Note:** Adjust the `--installPath` to match your Visual Studio installation location.

## Verification

After installation, verify that ClangCL is available:

```powershell
# Check if ClangCL is in the Visual Studio installation
Test-Path "D:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\Llvm"
```

## Next Steps

Once ClangCL tools are installed:

1. **Close and reopen your terminal** (to refresh environment variables)

2. **Configure npm to use MSVC instead of ClangCL** (to avoid LTCG compatibility issues):
   ```powershell
   npm config set msvs_version 2022
   npm config set msvs_use_clang false
   ```

3. **Run npm install:**
   ```powershell
   cd universal-git/worktrees/theia
   npm install
   ```

4. **If native modules still fail**, try rebuilding them:
   ```powershell
   npm rebuild native-keymap drivelist
   ```

## Troubleshooting

### If ClangCL is installed but still not found:
- Ensure you've restarted your terminal/PowerShell session
- Check that the Visual Studio installation path matches your actual installation
- Verify the component is installed: Look for `VC\Tools\Llvm` in your VS installation directory

### Alternative: Use MSVC instead
If you prefer to use MSVC instead of ClangCL, you can configure npm:
```powershell
npm config set msvs_version 2026
npm config delete clang
npm rebuild native-keymap
```

```
 npm i -d or -g node@22 node-gyp@latest npm@latest
 npx -p node@22 -p node-gyp@latest -p npm@latest npm install
```

## References
- [Visual Studio Installer Documentation](https://docs.microsoft.com/en-us/visualstudio/install/modify-visual-studio)
- [Clang/LLVM Support in Visual Studio](https://docs.microsoft.com/en-us/cpp/build/clang-support-msbuild)
