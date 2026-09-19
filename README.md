# WinLaunch 🚀

A modern, high-performance Windows desktop application to bookmark, organize, categorize, and launch web applications and websites directly in **Google Chrome** (with automatic fallback to the system default browser).

Built with **Electron**, **React 19**, **Tailwind CSS**, an **Embedded Express Backend**, and **Local SQLite / Cloud Sync Persistence**.

---

## ✨ Features

- ⚡ **Direct Google Chrome Launcher**: Launch websites straight into Google Chrome, whether in standard or incognito mode, with automatic system path detection across 32-bit, 64-bit, and user-level installations.
- 🔄 **Embedded Production Backend**: In the packaged Windows `.exe`, an embedded Express backend starts automatically in the background on app launch and terminates cleanly upon quitting. No manual `npm` or console commands are required by the end user.
- 💾 **Dual-Layer Persistence**:
  - **Local SQLite (`websites.db`)**: Direct local storage in `%APPDATA%\WinLaunch\` ensuring instant offline access and preservation across app updates.
  - **Cloud Account Sync**: Optional user account registration & login with cross-device bookmark backup, device tracking, and conflict-safe sync.
- 🔐 **Hardened Security**:
  - `contextIsolation: true` and `nodeIntegration: false` in Electron to prevent arbitrary code execution.
  - Strict Inter-Process Communication (IPC) boundary via `preload.cjs`.
  - SSRF-protected metadata scraper preventing intranet/private IP exploitation.
  - PBKDF2 password hashing with 100,000 iterations, unique cryptographic salts, and timing-safe token validation.
- 🎨 **Windows 11 Fluent UI**:
  - Frameless custom window title bar with native minimize, maximize, and close controls.
  - Light & dark themes with custom accent colors.
  - Customizable backgrounds: solid colors, curated gradients, Unsplash wallpapers, and custom image URLs with adjustable blur and overlay opacity.
- 🌐 **Automatic Metadata Extraction**: Enter any URL and WinLaunch automatically fetches high-resolution favicons, page titles, and meta descriptions.
- ⭐ **Pinning & Launch Analytics**: Pin frequently used apps to the top, search by title/URL/category, and track total launch counts and last-used timestamps.
- 📦 **One-Click JSON Backup**: Export and restore your complete library of websites and categories at any time.

---

## 🛠️ System Requirements

- **Operating System**: Windows 10 or Windows 11 (64-bit or ARM64)
- **Runtime for Building**: [Node.js](https://nodejs.org) v18.0.0 or higher
- **Package Manager**: npm (v9+) included with Node.js
- **Browser**: Google Chrome installed (optional; system default browser is used as a fallback if Chrome is not detected)

---

## 🚀 Quick Start (Development Mode)

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/winlaunch/winlaunch.git
   cd winlaunch
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The backend API and Vite development server will start on `http://localhost:3000`.

4. **Run in Desktop Electron Window (Optional)**:
   In a second terminal window:
   ```bash
   npm run electron:dev
   ```

---

## 📦 Building the Windows `.exe` Installer

To package the complete standalone Windows installer:

```bash
npm run electron:build
```

### What the Build Command Does:
1. Compiles the React frontend into static assets in `dist/`.
2. Bundles the Express backend server into `dist/server.cjs` using `esbuild`.
3. Invokes **electron-builder** with NSIS configuration.
4. Generates the standalone installer executable in `dist_electron/`:
   ```
   dist_electron/WinLaunch-Setup-1.0.0.exe
   ```

### Installer Capabilities:
- Standard Windows setup wizard with customizable installation directory.
- Automatically generates **Desktop** and **Start Menu** shortcuts.
- Configures `%APPDATA%\WinLaunch\` for persistent user databases and settings so updates never wipe your bookmarks.
- Automatically launches WinLaunch upon installation completion.

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` if you need custom runtime overrides:

```bash
cp .env.example .env
```

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the local Express server |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `GEMINI_API_KEY` | *(empty)* | Optional: Google Gemini API key for smart categorizations |
| `WINLAUNCH_DATA_DIR` | *(auto)* | Custom data storage path (defaults to `%APPDATA%\WinLaunch\`) |

---

## 📂 Project Architecture

```
winlaunch/
├── electron/
│   ├── main.cjs            # Electron main process (lifecycle, IPC, window management)
│   ├── preload.cjs         # Context-isolated secure preload bridge
│   └── server.cjs          # Standalone embedded Express backend for packaged app
├── src/
│   ├── components/         # React 19 UI components (Grid, AddModal, Settings, Login, etc.)
│   ├── services/           # Services (db.ts, auth.ts, metadata.ts, launcher.ts, apiConfig.ts)
│   ├── types.ts            # TypeScript data structures & Electron API interfaces
│   ├── App.tsx             # Root application view
│   └── main.tsx            # Entry React DOM mount
├── public/
│   ├── icon.ico            # Windows application & installer icon
│   └── favicon.svg         # Web favicon
├── server.ts               # Full-stack Express server with Vite middleware integration
├── electron-builder.json   # Windows NSIS packaging configuration
├── package.json            # Scripts, dependencies, and project metadata
├── .env.example            # Environment variable documentation
└── README.md               # Project guide and documentation
```

---

## 🧪 Testing & Verification

Run the TypeScript validator:
```bash
npm run lint
```

Test production compilation:
```bash
npm run build
```

---

## 🔒 Privacy & Data Protection

WinLaunch does not telemetry-track or transmit personal browsing data to third-party marketing servers.
- All bookmarks and launch counts are kept locally in SQLite on your device.
- Cloud account sync is strictly opt-in and connects exclusively to your configured WinLaunch server endpoint.
- All stored passwords use industry-standard salted PBKDF2 cryptography.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
