# VS Code GitLens Offline Patcher

A lightweight utility script that applies a runtime license bypass, overrides API verification calls, and mocks authentication checks for the GitLens extension. 

By running this script locally, all premium features are unlocked for offline and firewalled use without requiring internet connection or licensing gates.

---

##  Premium Features Unlocked

* **Unlimited Commit Graph**: Full visual history and branch visualizer without repository limits.
* **Visual File History**: Easily view diffs, authorship, and file changes visually across time.
* **Worktrees Management**: Create, switch, and maintain multiple Git worktrees concurrently.
* **Focus View & Launchpad**: A centralized dashboard view aggregating pull requests, issues, and active tasks.
* **Visual Branch & Tag Comparison**: Interactively inspect differences between commits, branches, or stashes.
* **Commit Composer & Review**: Write structured commits and perform reviews locally.

---

##  How to Build & Install Locally

You can download, patch, and package GitLens entirely on your own machine in a few simple steps.

### Prerequisites
Make sure you have Node.js (v22 or newer) and `pnpm` installed on your machine.

### 1. Clone the Official Repository
Clone the official, unmodified GitLens codebase from GitKraken:
```bash
git clone https://github.com/gitkraken/vscode-gitlens.git
cd vscode-gitlens
```

### 2. Download and Run the Patcher
Download this repository's `patch.mjs` script into the cloned `vscode-gitlens` directory and execute it:
```bash
# Download the script (or manually save patch.mjs into the folder)
curl -o patch.mjs https://raw.githubusercontent.com/Dxrmy/vscode-gitlens-patcher/main/patch.mjs

# Run the patcher
node patch.mjs
```

### 3. Install Dependencies & Build
Install the extension's dependencies and run the package build command:
```bash
# Install dependencies
pnpm install

# Build and package the extension
pnpm run package
```

### 4. Install the `.vsix` in VS Code
The package build command will generate a `.vsix` file (e.g. `gitlens-*.vsix`) in the project directory.
1. Open the Extensions tab in VS Code (`Ctrl+Shift+X` or `Cmd+Shift+X`).
2. Click the `...` menu in the top-right corner of the Extensions panel.
3. Select **Install from VSIX...** and choose the generated `.vsix` file.

---
*Disclaimer: This script is for educational purposes and personal offline/firewalled validation only.*
