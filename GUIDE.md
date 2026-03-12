# TG Downloader — Complete Build Guide

This guide takes you from zero to a working cross-platform desktop app (.dmg, .exe, .AppImage/.deb).

---

## What You'll Build

A desktop app that:
- Logs into your Telegram account (one time)
- Lets you pick chats/DMs to monitor
- Auto-downloads files from others matching extensions you define
- Saves each extension to a different folder you choose
- Runs silently in the system tray

---

## Prerequisites (One-time installs)

### 1. Install Node.js

Go to https://nodejs.org and download the **LTS version** (v20+).
Run the installer — just click Next/Accept/Install throughout.

Verify it worked: open **Terminal** (Mac: Spotlight → "Terminal") and run:
```
node --version
```
You should see something like `v20.x.x`.

### 2. Get your Telegram API credentials

You need these to use GramJS (the Telegram client library).

1. Go to **https://my.telegram.org** in your browser
2. Log in with your Telegram phone number
3. Click **"API Development Tools"**
4. Fill in:
   - App title: `TG Downloader` (any name)
   - Short name: `tgdownloader` (any short name)
   - Platform: `Desktop`
   - Description: leave blank
5. Click **Create Application**
6. You'll see your **API ID** (a number like `12345678`) and **API Hash** (a long hex string)
7. **Save these somewhere safe** — you'll enter them in the app on first run

---

## Project Setup

### 3. Unzip and open the project

1. Download and unzip `tg-downloader-project.zip`
2. You'll have a folder called `tg-downloader`
3. Open Terminal and navigate into it:
```
cd path/to/tg-downloader
```
(Tip: drag the folder onto the Terminal window to auto-fill the path)

### 4. Install dependencies

```
npm install
```

This downloads Electron, GramJS, and all other packages into a `node_modules` folder.
Takes about 1–2 minutes on first run.

### 5. Create placeholder icons

```
node scripts/create-placeholder-icons.js
```

This creates `assets/icon.png` and `assets/tray-icon.png` as placeholders.
The app will work with these — replace them with real icons later if you want.

**For real icons (optional):**
- `assets/icon.png` — 512×512 PNG, used for Linux
- `assets/icon.icns` — macOS icon bundle (use Image2icon or iconutil)
- `assets/icon.ico` — Windows icon (use https://convertio.co)
- `assets/tray-icon.png` — 16×16 or 32×32 PNG (macOS/Win tray)

---

## Running in Development

### 6. Start the app

```
npm start
```

The app window will open. On first launch you'll see the login screen.

### First run walkthrough:

1. **Enter your API ID and API Hash** from step 2
2. **Enter your phone number** (with country code, e.g. +1234567890)
3. Click **Send Code** — Telegram sends a verification code to your Telegram app
4. Enter the code and click **Verify**
5. If you have 2FA enabled, enter your cloud password
6. You're in! The main dashboard appears

### Setting up the app:

**Add chats to watch:**
1. Go to **Chats** in the sidebar
2. Click **Load Chats** — fetches your 100 most recent chats/DMs
3. Click any chat to add it to the watch list (it turns green)
4. Click again to remove it

**Add download rules:**
1. Go to **Rules** in the sidebar
2. Click **Add Rule**
3. Enter an extension, e.g.: `pdf`
4. Click **Browse** to pick a folder (e.g. `~/Downloads/PDFs`)
5. Click **Save Rule**
6. Repeat for other extensions

**Example rules you might want:**
- `pdf` → `~/Documents/PDFs`
- `mp4` → `~/Movies/Telegram`
- `zip` → `~/Downloads/Archives`
- `jpg` → `~/Pictures/Telegram`
- `docx` → `~/Documents/Telegram`

**Start monitoring:**
1. Go to **Dashboard**
2. Click **Start Monitoring**
3. The status dot turns green — the app is now watching
4. Minimize or close the window — it runs in the tray

---

## Building Installers

### Option A — Build macOS .dmg on your Mac (recommended first step)

```
npm run build:mac
```

This creates:
- `dist/TG Downloader-1.0.0-arm64.dmg` (Apple Silicon — M1/M2/M3)
- `dist/TG Downloader-1.0.0-x64.dmg` (Intel Mac)

To distribute: share the right .dmg for the user's Mac chip.

**macOS Gatekeeper warning:** Since the app isn't code-signed, users will see
"App can't be opened because it is from an unidentified developer".
Fix: right-click the app → Open → Open (bypasses the warning, one time only).

### Option B — Build all platforms via GitHub Actions (recommended for distribution)

This automatically builds .dmg (mac), .exe (windows), and .AppImage/.deb (linux)
every time you push a version tag.

#### 7. Create a GitHub repository

1. Go to https://github.com and create a new repository (private or public)
2. In Terminal, inside your project folder:

```
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

#### 8. Trigger a build

Tag a release to trigger the workflow:

```
git tag v1.0.0
git push origin v1.0.0
```

#### 9. Download the installers

1. Go to your GitHub repo in the browser
2. Click **Actions** tab — you'll see the build running
3. Wait ~5–10 minutes for all three platforms to finish
4. Click **Releases** in the sidebar — the installers are attached automatically:
   - `TG Downloader-1.0.0.dmg` — macOS
   - `TG Downloader Setup 1.0.0.exe` — Windows
   - `TG Downloader-1.0.0.AppImage` — Linux (universal, just run it)
   - `tg-downloader_1.0.0_amd64.deb` — Linux Debian/Ubuntu

---

## Installing on each platform

### macOS
1. Double-click the `.dmg`
2. Drag the app to Applications
3. Right-click → Open on first launch (bypasses Gatekeeper)

### Windows
1. Run the `.exe` installer
2. If SmartScreen warns: click "More info" → "Run anyway"
3. App installs and launches automatically

### Linux (AppImage)
```
chmod +x TG\ Downloader-1.0.0.AppImage
./TG\ Downloader-1.0.0.AppImage
```
Or double-click if your file manager supports it.

### Linux (Debian/Ubuntu .deb)
```
sudo dpkg -i tg-downloader_1.0.0_amd64.deb
```
Then find it in your app launcher.

---

## Project File Structure

```
tg-downloader/
├── src/
│   ├── main/
│   │   └── main.js          ← Electron main process (window, tray, IPC, monitoring)
│   ├── renderer/
│   │   ├── index.html        ← App UI markup
│   │   ├── styles.css        ← All styles
│   │   └── app.js            ← UI logic
│   └── preload/
│       └── preload.js        ← Secure bridge between main and UI
├── assets/
│   ├── icon.png              ← Linux icon (512×512)
│   ├── icon.icns             ← macOS icon
│   ├── icon.ico              ← Windows icon
│   └── tray-icon.png         ← System tray icon
├── .github/
│   └── workflows/
│       └── release.yml       ← GitHub Actions build config
├── scripts/
│   └── create-placeholder-icons.js
└── package.json              ← Dependencies + electron-builder config
```

---

## Customizing the App

### Change app name
In `package.json`, change `"productName": "TG Downloader"` to whatever you want.

### Change version
In `package.json`, change `"version": "1.0.0"`.

### Add more file types
No code changes needed — just add rules in the UI (Rules page → Add Rule).

### Auto-start with system
In the app's Settings page, enable **"Resume monitoring on launch"** and use your OS's
startup settings to add the app to login items.

---

## Troubleshooting

**"Not connected" after login**
- Check your API ID and Hash are correct (no extra spaces)
- Make sure you entered the phone number with the country code (+1, +44, etc.)

**Files not downloading**
- Verify the chat is in your "Watching" list (Chats page)
- Verify the extension rule exists (Rules page) — extension is lowercase, no dot
- The sender must NOT be you (it only downloads files from other people)
- Check the folder path is valid and you have write permission

**App doesn't appear in tray**
- On macOS: check the menu bar (top right of screen)
- On Windows: check the hidden icons area in the taskbar (^ arrow)
- On Linux: depends on your desktop environment; try GNOME extensions for tray support

**Build fails on GitHub Actions**
- Make sure all files are committed (`git status` should show nothing)
- Check the Actions tab for the specific error message

---

## Security Notes

- Your Telegram session is stored locally in the app's config file (encrypted by the OS keychain where available via electron-store)
- The API credentials never leave your machine
- The app only downloads files — it never sends messages or modifies anything
- You can log out anytime from Settings → Log Out, which clears the session

---

## Releasing New Versions

1. Make your changes
2. Update version in `package.json`
3. Commit and tag:
```
git add .
git commit -m "v1.1.0 - your changes"
git tag v1.1.0
git push origin main --tags
```
4. GitHub Actions builds and publishes the new installers automatically.
