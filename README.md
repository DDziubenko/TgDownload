# TG Downloader

> Auto-download files from Telegram chats by file extension — runs silently in your system tray.

---

## What it does

TG Downloader monitors your Telegram chats in the background and automatically saves files sent by other people to folders you choose — no manual downloading, no missed attachments.

You tell the app:
- Which chats or DMs to watch
- Which file types to download (pdf, mp4, zip, jpg, etc.)
- Which folder each file type should go into

After that it runs silently. Whenever someone sends a matching file in a watched chat, it downloads immediately and lands in the right folder.

> **Note:** TG Downloader only downloads files sent by **other people**. Files you send yourself are always ignored.

---

## Installation

Download the latest installer for your platform from the [Releases](../../releases) page:

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `TG Downloader-x.x.x-arm64.dmg` |
| macOS (Intel) | `TG Downloader-x.x.x-x64.dmg` |
| Windows | `TG Downloader Setup x.x.x.exe` |
| Linux | `TG Downloader-x.x.x.AppImage` or `.deb` |

### macOS
1. Open the `.dmg` and drag the app to Applications
2. On first launch: right-click the app → **Open** → **Open** (bypasses Gatekeeper warning)

### Windows
1. Run the `.exe` installer
2. If SmartScreen warns: click **More info** → **Run anyway**

### Linux (AppImage)
```bash
chmod +x TG\ Downloader-x.x.x.AppImage
./TG\ Downloader-x.x.x.AppImage
```

### Linux (.deb)
```bash
sudo dpkg -i tg-downloader_x.x.x_amd64.deb
```

---

## Getting Started

### 1. Get your Telegram API credentials

Before logging in for the first time you need a free API ID and API Hash from Telegram. This takes about 2 minutes and only needs to be done once.

**Step-by-step:**

1. Open **https://my.telegram.org** in your browser
2. Enter your phone number with country code (e.g. `+1234567890`) and click **Next**
3. Telegram sends a confirmation code to your Telegram app — enter it on the website
4. Click **"API Development Tools"**
5. Fill in the form:
   - **App title:** `TG Downloader` *(any name works)*
   - **Short name:** `tgdownloader` *(lowercase letters and numbers only, no spaces)*
   - **Platform:** select `Desktop`
   - **Description:** leave blank
6. Click **Create application**
7. Your credentials appear on the page:
   - **App api_id** — a number like `12345678`
   - **App api_hash** — a long hex string like `a1b2c3d4e5f6...`

> ⚠️ **Keep these safe.** Your API credentials are tied to your personal Telegram account. Do not share them with anyone.

**Common issues on my.telegram.org:**

| Symptom | Fix |
|---------|-----|
| Page reloads with no confirmation | It worked — scroll up, your credentials are already shown |
| "Short name already taken" | Try a different name like `tgdl2` or `mydownloader` |
| "Error" with no message | Short name has invalid characters — use only lowercase letters and numbers |
| Can't find API Development Tools | Make sure you are logged in and on the main page at my.telegram.org |

---

### 2. Log in to the app

On first launch you will see a three-step login screen.

**Step 1 — API Credentials**

Enter the API ID and API Hash you just obtained, plus your Telegram phone number with country code.

Click **Send Code →**

**Step 2 — Verification code**

Telegram sends a 5-digit code to your **Telegram app** (check the app on your phone or desktop — it appears as a message from Telegram). Enter the code and click **Verify →**

> If you don't have Telegram installed anywhere, the code arrives by SMS instead.

**Step 3 — Two-Factor Authentication** *(only if you have 2FA enabled)*

If your account has a cloud password, a third screen appears. Enter your Telegram cloud password and click **Confirm →**

> ✅ **Your session is saved after login.** The app remembers you permanently — you will never need to enter credentials again unless you manually log out from the Settings page.

### 2. Select chats to watch

1. Go to **Chats** in the sidebar
2. Click **Load Chats** — fetches your 100 most recent chats, groups, and DMs
3. Click any chat to add it to the watch list (it turns green)
4. Click it again to remove it

### 3. Add download rules

1. Go to **Rules** in the sidebar
2. Click **Add Rule**
3. Enter a file extension without the dot — e.g. `pdf`, `mp4`, `zip`
4. Click **Browse** to pick a destination folder
5. Click **Save Rule**

Repeat for each file type you want to capture. Example setup:

| Extension | Folder |
|-----------|--------|
| `pdf` | `~/Documents/PDFs` |
| `mp4` | `~/Movies/Telegram` |
| `jpg` | `~/Pictures/Telegram` |
| `zip` | `~/Downloads/Archives` |
| `mp3` | `~/Music/Telegram` |

### 4. Start monitoring

Go to **Dashboard** and click **Start Monitoring**. The status dot in the sidebar turns green. You can close the window — the app keeps running in the system tray.

---

## Dashboard

The dashboard shows:

- **Files Downloaded** — total files saved across all time
- **Today** — files downloaded today
- **Watched Chats** — number of chats currently being monitored
- **Active Rules** — number of configured extension → folder rules
- **Live Activity** — real-time feed of downloads as they happen
- **Quick Setup Status** — checklist showing if everything is ready

---

## Download History

The **History** page logs every file the app has saved, newest first. Each entry shows the filename, source chat, file size, and how long ago it was downloaded.

Click any entry to open the containing folder in Finder / Explorer.

Use the search bar to filter by filename or chat name.

**Clear All** removes the log but does not delete the actual downloaded files.

---

## Duplicate files

If the same filename already exists in the destination folder, the new file is saved with a version suffix rather than overwriting:

```
report.pdf        ← already exists
report v-1.pdf    ← second download
report v-2.pdf    ← third download
```

---

## Settings

| Setting | Description |
|---------|-------------|
| Start minimized | Launch directly to the system tray without showing the window |
| Resume monitoring on launch | Start monitoring automatically every time the app opens |
| Log Out | Disconnect your Telegram account and clear the saved session |

> **Tip:** Enable both options and add the app to your system login items — it will silently monitor from startup with zero manual action.

---

## System Tray

Once monitoring is active and the window is closed, the app lives in the system tray:

- **macOS** — top menu bar, right side
- **Windows** — taskbar, click the `^` arrow to reveal hidden icons
- **Linux** — depends on your desktop environment

Right-click the tray icon to see monitoring status, open the window, or quit.

> The app must be running in the tray for automatic downloading to work. Quitting fully stops monitoring.

---

## Troubleshooting

**Files not downloading**
- Check the chat is in your **Watching** list (Chats page)
- Check a rule exists for that extension (Rules page) — no dot, lowercase
- The file must be sent by someone else, not you
- Make sure the app is running (check the tray)

**Monitoring stops after sleep**
- Re-open the app and click Start Monitoring again

**App not visible in tray**
- macOS: check the top-right menu bar
- Windows: click the `^` arrow in the bottom-right taskbar corner
- Linux: some desktop environments require a tray extension (e.g. GNOME needs an extension for system tray support)

**Login code not arriving**
- Make sure you entered the phone number with the country code (`+1`, `+44`, etc.)
- Check your Telegram app — the code is sent there first, not SMS

---

## FAQ

**Is it safe?**
Yes. The app uses the official Telegram MTProto API. Your session is stored locally and never sent anywhere. The app only reads messages and downloads files — it never sends messages or modifies your account.

**Does it work while my computer is asleep?**
No. The app needs to be running on an awake computer. Files sent while it's off are not downloaded retroactively.

**Can I watch a group I'm not an admin of?**
Yes. You can monitor any chat your Telegram account has access to. Admin rights are not required.

**Can I use it on multiple computers?**
You can install it on multiple computers, but only one should actively monitor at a time with the same account.

**How do I update?**
Download the latest installer from the Releases page and run it. Your settings, rules, and history are preserved.

---

## Built with

- [Electron](https://www.electronjs.org/) — cross-platform desktop framework
- [GramJS](https://github.com/gram-js/gramjs) — Telegram MTProto client for Node.js
- [electron-store](https://github.com/sindresorhus/electron-store) — persistent config storage
- [electron-builder](https://www.electron.build/) — cross-platform packaging