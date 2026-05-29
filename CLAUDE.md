# PinballMagic — Project Context

## Project location
- App root: `C:\vpinball\pinballmagic\`
- Main files: `index.html` (renderer), `main.js` (Electron main), `preload.js` (context bridge)
- GitHub: `https://github.com/traskmi/PinballMagic.git` (branch: `main`)

## Cabinet paths (Windows 11)
- Frontend: PinUp Popper
- Visual Pinball: VPX
- Tables: `C:\vPinball\VisualPinball\Tables\`
- ROMs: `C:\vPinball\VisualPinball\VPinMAME\roms\`
- Alt Color: `C:\vPinball\VisualPinball\VPinMAME\altcolor\`
- Alt Sound: `C:\vPinball\VisualPinball\VPinMAME\altsound\`
- POPMedia: `C:\vPinball\PinUPSystem\POPMedia\Visual Pinball X\`
- PuP Videos: `C:\vPinball\PinUPSystem\PUPVideos\`
- Staging (Downloads): `C:\vPinball\pinballmagic\Downloads\`
- PinUp Popper DB: `C:\vPinball\PinUPSystem\PUPDatabase.db`

## Folder Structure
```
C:\vPinball\
  VisualPinball\
    Tables\               ← .vpx, .directb2s, .pov, .pdf
    VPinMAME\
      roms\               ← ROM zips
      altcolor\           ← alt color folders
      altsound\
  PinUPSystem\
    POPMedia\
      Visual Pinball X\
        Wheel\  PlayField\  BackGlass\  DMD\  Topper\  Menu\  Audio\
    PUPVideos\            ← PuP Pack folders
  pinballmagic\
    index.html
    main.js
    preload.js
    Downloads\            ← staging folder
```

## File Type → Destination
| Extension / Type | Destination |
|---|---|
| `.vpx` `.directb2s` `.pov` `.pdf` | Tables\ |
| `.zip`/`.rar` contains `.vpx` | Table archive → extract and sort contents |
| `.zip`/`.rar` contains `.directb2s` only | Backglass archive → extract to Tables\ |
| `.zip`/`.rar` contains `.pal`/`.vni`/`.cRZ` | Alt Color → altcolor\{rom}\ |
| `.zip`/`.rar` contains `altsound.csv` or ≥3 audio files | Alt Sound → altsound\{rom}\ |
| `.zip` contains `.dif` | VPU Remix Patch — manual only (needs VPUPatcher64) |
| `.zip`/`.rar` none of the above | ROM → roms\ |
| `.png` `.jpg` `.apng` | POPMedia\…\Wheel\ |
| video `_Playfield`/`_Table` | POPMedia\…\PlayField\ |
| video `_BackGlass` | POPMedia\…\BackGlass\ |
| video `_DMD` | POPMedia\…\DMD\ |
| video `_Topper` | POPMedia\…\Topper\ |
| video `_Menu` | POPMedia\…\Menu\ |
| `.mp3` `.wav` | POPMedia\…\Audio\ |
| PuP Pack folder | PUPVideos\ |

## Key Technical Notes
- `fflate` (CDN UMD) for in-browser ZIP decompression; `node-unrar-js` (IPC) for RAR in Electron
- `yauzl` for ZIP extraction in Electron main process
- `cGameName` extracted from VPX binary: plain ASCII in OLE container
- `compact(s)`: strips non-alphanumeric, lowercases — used for fuzzy matching
- VPS DB URL: `https://raw.githubusercontent.com/VirtualPinballSpreadsheet/vps-db/refs/heads/main/db/vpsdb.json`
- `makeElectronFileHandle(filePath)` — wraps a disk path as a File System Access API-compatible handle;
  `getFile()` returns an object that MUST include `_electronPath` so `executeInstall` routes to IPC not CDN

## PinUp Popper Database
- Path: `C:\vPinball\PinUPSystem\PUPDatabase.db`
- Games table key columns: `EMUID`, `GameName`, `GameFileName`, `GameDisplay`, `GameYear`, `Visible`, `DateAdded`
- Tool: DB Browser for SQLite

## ⚠️ CRITICAL
DO NOT run ClrVpin Cleaner without a proper XML database configured — it will delete everything!

---

## Release Process

### Version number lives in THREE places — all must match before pushing the tag:
1. `package.json` → `"version": "X.Y.Z"`
2. `index.html` header badge → `<div class="version" onclick="showChangelog()">vX.Y.Z</div>` (near line 206)
3. `index.html` changelog → new `<div class="cl-entry">` inserted at the TOP of the changelog list

### Step-by-step

**1. Determine the next version**
Check `package.json` for the current version. Bump the patch number (2.58.0 → 2.59.0) or minor as appropriate.

**2. Add a changelog entry in `index.html`**
Insert a new block immediately after `<h2>🎰 Changelog</h2>`:
```html
<div class="cl-entry">
  <div class="cl-version">vX.Y.Z<span class="cl-date">YYYY-MM-DD</span></div>
  <div class="cl-item">Description of change</div>
</div>
```

**3. Update the version badge in `index.html`**
```html
<div class="version" onclick="showChangelog()">vX.Y.Z</div>
```

**4. Update `package.json`**
```json
"version": "X.Y.Z"
```

**5. Stage and commit all changed files**
```powershell
$git = "C:\Users\Pinball 2\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe"
Set-Location "C:\vpinball\pinballmagic"
& $git add index.html main.js preload.js package.json
& $git commit -m "bump package.json to X.Y.Z"
& $git push origin main
```

**6. Create and push the version tag** ← this is what triggers the build
```powershell
& $git tag vX.Y.Z
& $git push origin vX.Y.Z
```

### What happens next
- GitHub Actions workflow (`.github/workflows/release.yml`) triggers on `push: tags: v*`
- Runs `npm run build` on `windows-latest` → produces NSIS installer + portable `.exe` in `dist/`
- Creates a GitHub Release named `PinballMagic vX.Y.Z` with the `.exe` files attached
- Monitor at: `https://github.com/traskmi/PinballMagic/actions`

### Git is NOT in PATH — always use the full path:
```
C:\Users\Pinball 2\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe
```

### Common mistakes
- Pushing a commit without the tag → build does NOT trigger
- Using the same version number as a previous commit → tag push fails or creates a duplicate release
- Forgetting to update all three version locations → app header shows wrong version
