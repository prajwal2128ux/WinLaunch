# WinLaunch - Windows Desktop App (.exe) Setup & Build Guide

A modern Windows desktop app to save, organize, and launch websites directly in Google Chrome with local SQLite persistence.

## 🚀 Key Features

* **Quick Website Launcher**: Save and launch websites directly in **Google Chrome** with fallback to default browser.
* **Auto-Fetch Metadata**: Automatically grabs the website name, description, and high-resolution favicon from any URL.
* **Local SQLite Database**: All records are saved in SQLite (`websites.db`) inside `%APPDATA%\WinLaunch\` so data is retained securely across restarts.
* **Windows 11 UI**: Fluent Design styling, dark/light theme, custom title bar, category color tags, and search.
* **Favorites & Tracking**: Pin favorite websites and track launch counts and recent activity.
* **Import & Export**: Backup and restore all bookmarks via JSON.
* **Installer (.exe)**: Packaged as an installable Windows `.exe` setup with Start Menu and Desktop shortcuts.

---

## 🛠️ Prerequisites for Building on Windows

1. **Node.js 18+** installed ([Download Node.js](https://nodejs.org))
2. **Git** (optional)
3. **Google Chrome** installed (optional, app will auto-fallback to default browser if not installed)

---

## 📦 How to Run in Development Mode

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev

# 3. (Optional) Run directly inside Electron
npm run electron:dev
```

---

## 🏗️ How to Build the Windows `.exe` Installer

Run the single build command:

```bash
npm run electron:build
```

### What This Does:
1. Compiles the modern UI assets into `dist/`.
2. Packages the Electron application using **electron-builder**.
3. Generates the installer executable in `dist_electron/`:
   - `dist_electron/WinLaunch-Setup-1.0.0.exe`
4. The NSIS installer will:
   - Allow choosing the installation folder.
   - Automatically create a **Start Menu shortcut**.
   - Automatically create a **Desktop shortcut**.
   - Store all SQLite database files safely in `%APPDATA%\WinLaunch\websites.db` (ensuring your bookmarks are never deleted when updating or reinstalling the app).

---

## 🔒 Security Practices

* `contextIsolation: true` is enabled in `electron/main.cjs`.
* `nodeIntegration: false` is strictly enforced to prevent arbitrary remote code execution.
* Inter-Process Communication (IPC) is strictly bridged via `electron/preload.cjs`.
