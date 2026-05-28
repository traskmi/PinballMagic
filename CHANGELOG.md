# Virtual Pinball Magic Downloader — Changelog

## v2.13.5 — 2026-05-24
- **🐛 Auto-detect apply fix** — `applyAutoDetect()` previously called `updatePathDisplay()` only after `await Promise.all(saves)`; if any IndexedDB write failed (Chrome may reject serialization of navigated FileSystemHandle objects), the entire await rejected and the UI was never updated — altcolor/altsound showed "not selected" despite detection succeeding
- Handles are now assigned to module-level variables immediately (synchronous), then `updatePathDisplay()` and `hideAutoDetectModal()` are called before any async operation; IDB persistence runs in the background with a `logWarn` on failure

## v2.13.4 — 2026-05-24
- 🔧 Auto-detect: altcolor and altsound now try plain `getDirectoryHandle` first (no create flag), then `tryCreate`, then full path chains — maximises chance of finding existing folders
- Added `logInfo` lines during auto-detect showing root name, VPinMAME found/not-found, and a full summary of detected paths

## v2.13.3 — 2026-05-24
- **📍 Full path display** — Install Paths panel shows complete relative path (e.g. `vPinball\PinballMagic\Downloads`) instead of just folder name; hover tooltip for long paths
- Paths computed via `FileSystemHandle.resolve()` during auto-detect, persisted to IndexedDB (`handle_display_paths`), restored on page load
- Auto-detect results list shows full paths before you click Apply
- Manual "change" picks show just the folder name; clear any stored display path for that slot

## v2.13.2 — 2026-05-24
- 🐛 Auto-detect: added `tryDir('Tables')` for tables, `tryDir('VPinMAME')` as first option for ROMs/altcolor/altsound (direct child of root) so picking `VisualPinball` as root works correctly
- Auto-detect instruction text updated from "pick your root drive" to "pick your vPinball or VisualPinball folder"

## v2.13.1 — 2026-05-24
- 🐛 Auto-detect: extended path search to cover `VisualPinball` or `vPinball` as root; altcolor and altsound detection added to `autoDetectPaths()`

## v2.13.0 — 2026-05-24
- **🎨 Alt Color support** — ZIPs containing `.pal`/`.vni` (PIN2DMD) or `.cRZ` (Serum) are now auto-classified as alt color packs and extracted to `VPinMAME\altcolor\{rom}\` during install
- **🔊 Alt Sound support** — ZIPs containing `altsound.csv`, `g-sound.csv`, or ≥3 audio files (`.ogg`/`.mp3`/`.wav`) are classified as alt sound packs and extracted to `VPinMAME\altsound\{rom}\`
- ROM folder name derived from top-level folder inside ZIP (e.g. `bop_l7/`); falls back to ZIP filename without extension
- Install Paths panel gains **Alt Color** and **Alt Sound** rows; Auto-detect finds `VPinMAME\altcolor\` and `VPinMAME\altsound\` automatically
- Install plan shows destination folder (`→ altcolor\bop_l7\`) with file count for each pack before install is approved
- First-time install prompts for the `altcolor\` / `altsound\` folder if not already set (same lazy-prompt pattern as ROMs)

## v2.12.0 — 2026-05-24
- **🎮 ROM folder scan** — when the ROMs path is set, `scanInstalledRoms()` enumerates all `.zip` files in `VPinMAME\roms\` and caches them in `installedRoms` (a module-level `Set`); re-scans on path change and on app startup
- **Install plan ROM status** — `checkRomStatus()` now checks `installedRoms` first; shows ✅ "already installed" when the exact ROM is present, ⚠️ "have compatible revision, may work" when a same-family ROM exists (e.g. `bop_l8.zip` when table needs `bop_l7`)
- **Table list ROM badge** — grey `rom` when not installed, cyan `✓ rom` when exact ROM is installed, amber `⊕ rom` when a compatible revision is present
- Last fallback message changed from "not in selection" to "not installed · download needed" now that installed state is known

## v2.11.2 — 2026-05-24
- **📁 Self-contained directory structure** — `Backups\` and `Downloads\` are created under `PinballMagic\` (same folder as `index.html`); the entire app is redistributable as a single folder
- **💾 Backup writes to `PinballMagic\Backups\`** — no browser download dialog; auto-prunes to max 3 copies (oldest deleted first); status shows `N/3 copies in Backups\`
- Auto-detect now also sets `Downloads\` as the staging folder alongside `Backups\`, both located relative to the `PinballMagic\` directory
- Falls back to browser download if no backup folder is configured (e.g. first run before auto-detect)

## v2.11.1 — 2026-05-24
- **🔍 Auto-detect paths** — "Auto-detect" button in the Install Paths header picks your root drive (`C:\`) and scans for all cabinet paths simultaneously; shows ✅/— for each path, then applies all found handles with one click
- Tries common layouts: `vPinball\VisualPinball\Tables`, `Visual Pinball\Tables`, `PinUPSystem\POPMedia\Visual Pinball X`, `PinUPSystem\PUPVideos`, `PinUPSystem\PUPDatabase.db` and `vPinball\` variants
- Default Popper DB location is `C:\PinUPSystem\PUPDatabase.db` — auto-detect finds it automatically if the root drive is picked

## v2.11.0 — 2026-05-24
- **🎮 Popper Database path** — `PUPDatabase.db` is now a saved path in the Install Paths panel (`popperDbHandle` stored in IndexedDB as `handle_popperdb`); set it once with the "change" button
- **📋 One-click Backup DB** — if the path is already saved, "Backup DB first" reads directly from the stored handle with no file picker; only prompts on first use or if the browser permission lapses
- First-time backup via the picker automatically saves the handle so all subsequent backups are instant

## v2.10.9 — 2026-05-24
- **🎲 Auto-rename same-family ROMs** — when `bop_l8.zip` is in your selection and the table needs `bop_l7`, the install plan shows "✅ Will be installed as `bop_l7.zip`" and writes it under that name during install; no manual rename step
- The ROM item in the plan shows "same game, different revision" so the user understands what's happening before approving
- Table ROM status correctly shows ✅ (not ⚠️) when a same-family rename will satisfy the requirement

## v2.10.8 — 2026-05-24
- **🎲 ROM revision mismatch detection** — install plan now explains the difference between what the table needs (`bop_l7`) and what VPS has (`bop_l8`), and tells you to rename the downloaded file rather than just showing a generic ⚠️
- **`romFamily()`** — strips the revision suffix (`_l7`, `_f8`, `_13`) to identify same-game ROMs across revisions; `bop_l7` and `bop_l8` both resolve to family `bop`
- Four-state ROM display: exact match (✅ included) → same-family in selection (⚠️ rename this file) → same-family only in VPS (⚠️ download and rename) → no match (⚠️ not in selection)
- ROM items also show a rename hint when a same-family ROM in your selection satisfies a table's requirement under a different revision name

## v2.10.7 — 2026-05-24
- **🎡 `.apng` support** — animated PNG wheel images now routed to `POPMedia\…\Wheel\` alongside `.png`/`.jpg`; included in the file picker accept list, ZIP extraction classifier, and wheel-rename logic

## v2.10.6 — 2026-05-24
- **🎭 `cAuthor` extracted from VPX binary** — same scan that finds `cVersion` and `cGameName`; matches `Const cAuthor = "…"` and bare `cAuthor = "…"` in both latin1 and UTF-16LE; stored in `scannedMeta` alongside the other fields
- **4-level match priority in `getInstalledVpsFile`**: (1) `cVersion` + `cAuthor` both match → exact identification; (2) `cVersion` alone → version match; (3) `cAuthor` alone → most recent entry from that creator fork (with filename-version sub-check); (4) filename contains version string → filename fallback
- **`authorsOverlap()`** — tokenises the comma-separated `cAuthor` string and requires at least one ≥4-char token to appear in the VPS authors list; prevents false matches on short author names
- Scan status now shows `N/total have version · N/total have author` so you can see how many tables were fully identified

## v2.10.5 — 2026-05-24
- **🐛 `cVersion` false match removed** — bare `Version=` in VPX binary is the VPX engine version (e.g. `2.10.38`), not the table version; the fallback regex now requires the `c` prefix (`cVersion=`) so only author-defined table versions are extracted
- **🔄 Date-based update detection** — "newer version avail" now means a newer upload exists in VPS (by `updatedAt` date), not a higher version number; version numbers across different authors/forks are independent sequences and cannot be meaningfully compared
- **`getInstalledVpsFile(t)`** — new function that finds the exact VPS `tableFiles` entry matching the installed file (prefers `cVersion` match, falls back to filename containing the version string); used for update detection, installed-badge display, and row highlight in the detail panel
- Installed badge falls back to the matched VPS entry's version when binary `cVersion` is absent; update badge tooltip now says "You have: vX.X (Mon Year) · Newer upload: vX.X (Mon Year)"

## v2.10.4 — 2026-05-24
- **🐛 Binary scan reads both ends** — `performScan` now reads the first 4 MB AND the last 2 MB of each VPX file separately, calls `extractVpxMeta` on each, then merges results (tail takes priority); this fixes the v2.10.3 regression where only the tail was read, causing installed tables with VBScript in the first 4 MB to show no binary version (dropped from 18/62 to ~1/62)
- Older/smaller tables have their VBScript near the start of the OLE container; large modern files (100 MB+) have it at the very end after all texture data — both cases are now covered without a full-file read

## v2.10.3 — 2026-05-24
- **🐛 Binary scan reads from the wrong end** — VBScript in VPX files is always allocated in the last 1-2 MB (after all image/texture OLE streams); the previous 4MB-from-front read missed it entirely for large files; now scans the last 2MB first, then first 512KB as fallback for small/old files
- This is why only 18/62 installed tables showed binary version: the 18 were small enough that their script fell within the first 4MB; the remaining 44 will now be scanned correctly after a re-scan
- Research finding: many modern VPX tables (VPW releases, etc.) don't define `cVersion` at all — for those the filename remains the version source, which is correct

## v2.10.2 — 2026-05-24
- **📋 PUPDatabase backup** — "Backup DB first" button in the Popper import section opens a file picker to select `PUPDatabase.db`, then downloads a timestamped copy (`PUPDatabase_backup_2026-05-24_143022.db`); run this before applying any SQL changes
- **🗑 Old-version file deletion** — the "Previous versions detected" cleanup panel now lists `.vpx`, `.directb2s`, and `.pov` files for each replaced table with individual Delete buttons; clicking calls `removeEntry` via the Tables folder handle and updates the button to ✓ Deleted / — not found in-place

## v2.10.1 — 2026-05-24
- **🗑 Old-version Popper cleanup** — when a newly installed table replaces an existing one with a different filename, the install summary shows a "Previous version detected" section listing the old → new filename pair; a separate `popper_cleanup.sql` download removes only the Popper config entry (does not touch the `.vpx` file on disk)
- Old filename is captured before the post-install re-scan so the detection is accurate even if the scan runs first
- Cleanup SQL uses the same safe EMUID subquery pattern; intended to be run after the user has tested the new version

## v2.10 — 2026-05-24
- **🔍 Binary version extraction** — Scan Tables Folder now reads the first 4MB of every VPX file and extracts `cVersion` from the embedded VBScript (matches `Const cVersion = "2.03"` and bare `cVersion = "…"` patterns in both latin1 and UTF-16LE)
- **✓ v2.03 installed badge** — when binary version is available, the installed badge shows the actual version (`✓ v2.03`) instead of just `✓ installed`; update badge tooltip shows "Installed: v2.03 · VPS has v2.04"
- **Accurate update detection** — "Newer version avail" tile and 🔄 badges now compare binary `cVersion` against VPS when available; files with no version in their filename still get correct update detection
- **Scan progress counter** — button shows `⏳ 12/85` while reading; scan status shows `72/85 have binary version` after completion
- Scan falls back gracefully to filename-only detection for any file that can't be read

## v2.9.2 — 2026-05-24
- **🐛 Backglass conflict detection** — when multiple backglass ZIPs (or `.directb2s` files) resolve to the same VPX base name they'd overwrite each other; now grouped into a radio-style conflict picker labeled "Multiple backglass files for X — pick one to install"; deselected entries are skipped

## v2.9.1 — 2026-05-24
- **🐛 Install plan modal sticky** — clicking outside the Install Plan popup no longer dismisses it; only Cancel, ✕, or Install Now close it (prevents losing the plan accidentally)

## v2.9 — 2026-05-24
- **📚 Persistent diff history** — "See what changed →" now survives page refreshes; every update that contains changes is saved to IndexedDB and accumulated across sessions
- History depth is user-configurable (default 10) via a "Keep last N updates" input in the popup footer; empty (no-change) updates don't count against the limit
- On page load the most recent update's counts (✨ N new / 🔄 N updated) are restored next to the link so you always see what the last meaningful update contained
- Popup renders all stored entries newest-first, each with a timestamp header and the full new/updated table lists

## v2.8 — 2026-05-24
- **📅 VPS dates in version list** — each table version in the detail panel shows its published date (e.g. `· May 2025`) in muted text next to the version number; sourced from `tableFiles[i].updatedAt` (epoch ms)
- **🔄 Update badge with date** — the per-row update badge now reads `🔄 v2.4 · May 2025` so you can immediately see how long ago the newer version was published; badge tooltip includes the full date too

## v2.7 — 2026-05-24
- **🔄 "Newer version avail" stat tile** — fifth tile shows count of installed tables where VPS has a newer version; clickable to filter the list to just those tables
- Shows `—` until Tables folder is scanned; updates automatically after every scan or install

## v2.6 — 2026-05-24
- **📡 VPS database diff** — after "Update Now", shows `✨ N new  🔄 N updated` inline under the DB status line
- **"See what changed →"** opens a popup with the full list: new tables (teal) and updated tables (amber) with file gain counts
- Diff compares `tableFiles`, `b2sFiles`, `romFiles`, and `wheelArtFiles` counts per table ID

## v2.5 — 2026-05-24
- **📋 Activity log** — "📋 Log" button in toolbar opens a timestamped log of every install operation (copy, rename, extract, scan, error)
- **🔍 Verbose/debug mode** — toggle in log panel captures writeFile byte counts, ZIP entry lists, VPS lookup hits/misses, peekZip classifications
- **💾 Download .log** — export full session log as `pinballmagic_YYYY-MM-DD.log` for troubleshooting

## v2.4 — 2026-05-23
- **🔧 Backglass rename** — `.directb2s` files (from ZIP or direct) are written with the same base name as the matched `.vpx` so B2S Server can load them
- **🎡 Wheel rename** — wheel images renamed to `{VPX base name}.{ext}` so Popper's `GameName` media lookup matches; falls back to single-VPX assumption when batch contains only one table
- **🔗 Missing wheel fallback** — if no wheel was in the install batch, the summary shows a direct VPS download link per table

## v2.3 — 2026-05-23
- **🐛 Popper SQL schema fix** — column names corrected to match real `PUPDatabase.db`: `EMUID` (not `EmulatorID`), `GameFileName` (not `GameFile`), `GameYear` (not `Year`)

## v2.2 — 2026-05-23
- **🐛 Backglass conflict false-positive** — direct `.directb2s` / `.pov` files are no longer pulled into version conflict pickers; only `.vpx` files and table ZIPs generate a conflict group

## v2.1 — 2026-05-23
- **🐛 writeFile silent-empty fix** — fflate `Uint8Array` views with `byteOffset !== 0` now copied to a standalone `ArrayBuffer` before writing; this was causing backglass/POV ZIP contents to write 0 bytes with no error thrown
- `writeFile` hardened: `keepExistingData: false`, `truncate(bytes.length)` after write, `abort()` on failure, empty-source guard

## v2.0 — 2026-05-23
- **🎮 PinUp Popper SQL export** — after every install, a `popper_import.sql` download button appears in the summary; run it in DB Browser for SQLite to add tables to Popper's All Games list
- Script uses `INSERT OR IGNORE` (safe to re-run), includes `GameName` for media matching, `GameDisplay`, `GameFile`, `Manufacturer`, `Year`, and a ROM name comment
- EmulatorID 3 = Visual Pinball X (instructions in the script to verify against your Emulators table)
- **Future (Electron)**: direct SQLite write with Popper-closed check planned

## v1.9 — 2026-05-23
- **🔄 Update badge** — installed tables show "🔄 v{x.x} avail" in purple when VPS has a newer version than the scanned filename
- **🖱 Clickable stat tiles** — Total / Installed / Missing tiles filter the table list; active tile is highlighted

## v1.8 — 2026-05-23
- **📥 New Files staging folder** — set once via path panel; Install Files auto-scans it with zero clicks, no file picker, no Ctrl+A
- **Re-scan reuses saved handle** — no folder picker on subsequent scans; only prompts if no handle saved yet
- **Installed detection fix** — `performScan` now applies full double-pass name stripping so short names like "24" match correctly

## v1.7 — 2026-05-23
- **ROM name from VPS `version` field** — reads `romFiles[].version` directly (e.g. `bop_l8`, `tom_13`); URL parsing was unreliable and removed
- **Smarter table name extraction** — strips ` v.2.3.1` / `(Stern 2009)` style suffixes with a double-pass; short names like "24" now match via exact lookup
- **Backglass ZIPs** — ZIPs containing `.directb2s` (no `.vpx`) now extracted to Tables folder instead of misclassified as ROM
- **POV ZIPs** — ZIPs containing `.pov` extracted to Tables folder
- **writeFile reliability fix** — file bytes read into memory before opening destination; eliminates silent empty-file writes
- **📁 Path panel shows real folder names** — verify Tables/ROMs/POPMedia handles are pointing at the right directories
- **Change buttons on each path** — re-select any folder handle without restarting
- **Creator search** — search box now matches authors/creators (type "jpsalas", "fuzzel", etc.)
- **File picker starts in Downloads** — `startIn: 'downloads'` so you never have to navigate there manually

## v1.6 — 2026-05-23
- **🔧 VPU Remix Patch detection** — ZIPs containing `.dif` files are now correctly classified as VPU Remix backglass patches (previously misidentified as Alt Color Packs)
- **Manual-only section in Install Plan** — VPU Remix Patches appear in a separate red-bordered info box; no auto-install attempted since they require the VPUPatcher64 tool from vpuniverse.com
- Instructions shown inline: select original `.directb2s` + `.dif` in VPUPatcher64 → Apply Patch → save output as `.directb2s` → place in Tables folder; see included tutorial PDF

## v1.5 — 2026-05-23
- **☑ Per-item skip checkboxes** — click any item in the install plan to uncheck/re-check it before confirming
- **⊘ Skip entire conflict group** — version conflict picker now has a "Skip — don't install" radio option
- ROM detection extended to 16MB scan window; UTF-16LE fallback added for older VP versions; hyphen allowed in ROM names
- File picker remembers last used directory (`id: 'vpmagic-downloads'`)

## v1.4 — 2026-05-23
- **ROM name from VPX binary** — `cGameName` read directly from the VPX file's embedded VBScript (stored as plain ASCII text inside the OLE container); works for every table regardless of whether the VPS database has a direct download URL
- For table ZIPs, extraction is free — fflate already has the decompressed bytes, just regex-scan the VPX entry
- For direct `.vpx` files, only the first 4MB is sliced (script appears early); no full-file read needed
- Priority chain: VPX binary `cGameName` → VPS URL filename → `null` (nothing shown); eliminates `index.php.zip` false positives

## v1.3 — 2026-05-23
- **🔄 Auto-update from GitHub** — "Update Now" button fetches `vpsdb.json` directly from VirtualPinballSpreadsheet on GitHub; saves to IndexedDB automatically; no manual download ever again
- **⚠️ Staleness warning** — "Last updated X days ago" shown next to DB status; turns amber with ⚠️ after 7 days
- **Update Now on load screen** — new installs can skip the file browser entirely; just click and go
- `VPS_DB_URL` constant defined once so URL is easy to update if the GitHub path ever changes

## v1.2 — 2026-05-23
- **VPS ROM lookup** — install plan shows `Requires: bop_l8.zip` for each table, cross-referenced against the VPS database already in memory
- **✅/⚠️ ROM status** — each table version shows whether the required ROM is already included in the current file selection
- **Version conflict picker** — multiple versions of the same table detected automatically; radio-style selector lets you pick which one to install (newest pre-selected); unselected versions are skipped
- Selected file count updates live as you switch versions in the conflict picker

## v1.1 — 2026-05-23
- **Full file type matrix** — handles `.vpx`, `.directb2s`, `.pov`, `.pdf`, `.zip`, video (`.mp4`/`.f4v`/`.mkv`), wheel images (`.png`/`.jpg`), audio (`.mp3`/`.wav`)
- **Smart video routing** — detects destination from filename keyword: `_Playfield`, `_BackGlass`, `_DMD`, `_Topper`, `_Wheel`, `_Menu`; ambiguous videos show in Skipped list with explanation
- **🎮 Install PuP Pack button** — `showDirectoryPicker` copies entire PuP Pack folder to `PUPVideos\` in one click
- **Confirmation modal** — shows full install plan (grouped by category, with ZIP contents preview) before touching any files
- **Consolidated media handle** — single pick of `POPMedia\Visual Pinball X\` covers all 7 media subfolders; no more separate picks per type
- All folder handles updated: `handle_popmedia` replaces `handle_wheel`; `handle_pupvideos` added
- Results summary expanded to show PlayField, BackGlass, DMD, Topper, Menu, Audio, and PuP Pack categories

## v1.0 — 2026-05-23
- **📥 Move Downloads button** — one-click installer for downloaded pinball files
- Peeks inside `.zip` files to classify them: contains `.vpx` → table zip (extract & sort); no `.vpx` → ROM zip (move as-is)
- Extracted table zips are sorted by type: `.vpx`/`.directb2s` → Tables folder, nested `.zip` → ROMs folder, `.png`/`.jpg` → Wheel images folder; `.txt`/`.pdf`/screenshots ignored
- Directly downloaded `.vpx` and `.directb2s` files are moved to Tables folder without extraction
- All 4 directory handles (Downloads, Tables, ROMs, Wheel) persisted in IndexedDB via `fflate` — select folders once, then one click forever
- Auto re-scans Tables folder after every move so installed count updates immediately
- Summary modal shows files moved, grouped by category (Tables, ROMs, Wheel Images), plus any errors
- Uses `fflate@0.8.2` (CDN) for fast in-browser zip decompression

## v0.9 — 2026-05-23
- **Table preview images** — 80px thumbnail shown inline on every row using `imgUrl` from VPS database, lazy loaded so scrolling stays fast
- Larger image (up to 220px tall) shown at the top of the expanded detail panel
- `getImgUrl(t)` helper with fallback chain (`imgUrl → imageUrl → img`)
- Broken or missing images degrade gracefully — `visibility:hidden` on load error keeps layout intact; placeholder `<div>` used when no URL exists

## v0.8 — 2026-05-23
- **IndexedDB caching** — vpsdb.json is stored in IndexedDB after the first load; app auto-loads on every subsequent visit with no file picker
- "Cached X ago" timestamp shown in the path-info panel
- **📂 Reload database** button lets you refresh when you download a new vpsdb.json
- Refactored `loadFile` → `processJson` to share logic between file-picker and cache paths

## v0.7 — 2026-05-23
- **📁 Scan Tables Folder** — uses the browser File System Access API (`showDirectoryPicker`) to read actual `.vpx` filenames from `C:\vPinball\VisualPinball\Tables\`
- `stripVersion()` cleans filenames before matching (strips trailing version numbers and parenthetical info)
- Scan results persist in `localStorage` between sessions; button shows "Re-scan" with timestamp after first scan
- `isInstalled()` uses real scan data when available, falls back to built-in hardcoded list
- Requires Chrome or Edge (Firefox does not support `showDirectoryPicker`)

## v0.6 — 2026-05-23
- **Fuzzy search fix** — added `compact()` helper that strips all non-alphanumeric characters before comparison, so "pinbot" reliably finds "PIN-BOT", "Pin·Bot", etc.
- Replaced `nameNoSpace`/`searchNoSpace` (space-stripping from normalized form) with direct `compact()` on both sides

## v0.5 — 2026-05-23
- Initial prototype — built in one afternoon 🎱
- Load `vpsdb.json` locally via FileReader API (no upload, no network restrictions)
- Displays 2,500+ tables from the open source VPS database
- Search by name; filter by manufacturer and year
- Installed vs missing detection via hardcoded table name list
- Download buttons for VPX table, B2S backglass, ROM, and Wheel image files
- Click any row to expand and see all available versions with per-author download links
- Stats bar: total tables, installed count, missing count, currently showing
