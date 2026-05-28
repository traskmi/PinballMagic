# Virtual Pinball Magic Downloader — Project Context

## App
Single-file browser app: `C:\vPinball\PinballMagic\index.html`
VPS database: `C:\vPinball\vpsdb.json` (~6.7MB, auto-updates from GitHub)
Current version: **v2.23.0**

## Cabinet (Windows 11)
- Frontend: PinUp Popper v1.5.0
- Visual Pinball: VPX 10.8.0
- MAME: `C:\Program Files (x86)\MAME\`

## Folder Structure
```
C:\vPinball\
  VisualPinball\
    Tables\               ← .vpx, .directb2s, .pov, .pdf
    VPinMAME\
      roms\               ← ROM zips
      altcolor\           ← alt color folders (auto-installed from .pal/.vni/.cRZ ZIPs)
      altsound\
  PinUPSystem\
    POPMedia\
      Visual Pinball X\
        Wheel\  PlayField\  BackGlass\  DMD\  Topper\  Menu\  Audio\
    PUPVideos\            ← PuP Pack folders
  PinballMagic\
    index.html
```

## File Type → Destination
| Extension / Type | Destination |
|---|---|
| `.vpx` `.directb2s` `.pov` `.pdf` | Tables\ |
| `.zip` (contains `.pal`/`.vni`/`.cRZ`) | VPinMAME\altcolor\{rom}\ |
| `.zip` (contains `altsound.csv`/`g-sound.csv` or ≥3 audio files) | VPinMAME\altsound\{rom}\ |
| `.zip` (no `.vpx` inside, no `.dif`, not alt color/sound) | VPinMAME\roms\ |
| `.zip` (contains `.dif`) | **VPU Remix Patch — manual only** (needs VPUPatcher64) |
| `.png` `.jpg` | POPMedia\…\Wheel\ |
| video `_Playfield` / `_Table` | POPMedia\…\PlayField\ |
| video `_BackGlass` | POPMedia\…\BackGlass\ |
| video `_DMD` | POPMedia\…\DMD\ |
| video `_Topper` | POPMedia\…\Topper\ |
| video `_Menu` | POPMedia\…\Menu\ |
| `.mp3` `.wav` | POPMedia\…\Audio\ |
| PuP Pack folder | PUPVideos\ |

## ZIP Classification Logic
1. Contains `.vpx` → Table ZIP → extract and sort contents
2. Contains `.directb2s` (no `.vpx`) → Backglass ZIP → extract to Tables\
3. Contains `.pov` (no `.vpx`, no `.directb2s`) → POV ZIP → extract to Tables\
4. Contains `.dif` → VPU Remix Patch → show instructions only, no auto-install
5. Contains `.pal`/`.vni`/`.cRZ` → Alt Color → extract to altcolor\{rom}\
6. Contains `altsound.csv`/`g-sound.csv` or ≥3 audio files → Alt Sound → extract to altsound\{rom}\
7. None of the above → ROM ZIP → move intact to roms\

## PinUp Popper Database
- Path: `C:\PinUPSystem\PUPDatabase.db`
- Games table key columns: `EMUID`, `GameName`, `GameFileName`, `GameDisplay`, `GameYear`, `Visible`, `DateAdded`
- EMUID looked up via subquery: `SELECT EMUID FROM Emulators WHERE EmuName LIKE '%Visual Pinball%' LIMIT 1` — safe for all installs
- Tool: DB Browser for SQLite — Execute SQL tab → paste → F5 → Write Changes

## Key Technical Notes
- `fflate@0.8.2` (CDN UMD) for in-browser ZIP decompression
- `cGameName` extracted from VPX binary: plain ASCII in OLE container, 16MB scan, UTF-16LE fallback
- `compact(s)`: strips non-alphanumeric, lowercases — used for fuzzy matching
- `stripVersion(s)`: strips trailing `(...)`, `[...]`, version numbers from filenames
- VPS DB URL: `https://raw.githubusercontent.com/VirtualPinballSpreadsheet/vps-db/refs/heads/main/db/vpsdb.json`
- `showDirectoryPicker` blocked on OS special folders (Downloads, Desktop, Documents); `showOpenFilePicker` works for files in Downloads
- All folder handles persisted in IndexedDB; vpsdb.json cached in IndexedDB

## ⚠️ CRITICAL
DO NOT run ClrVpin Cleaner without a proper XML database configured — it will delete everything!
Backup: `C:\ProgramData\ClrVpin\backup\`
Recovery: `xcopy "C:\ProgramData\ClrVpin\backup\[date]\deleted\Tables\*.*" "C:\vPinball\VisualPinball\Tables\" /Y`
