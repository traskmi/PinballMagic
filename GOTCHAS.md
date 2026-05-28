# PinballMagic — Known Limitations & Gotchas
**For display in the packaged app's Help / About screen**

These are intentional trade-offs or technical constraints that users may encounter. Knowing them upfront prevents confusion.

---

## File Classification

### Build Type Detection is Filename-Only
Cabinet vs Desktop warnings are based on filename keywords (`_CAB`, `_Cabinet`, `_Desktop`, `_FSS`, `_DT`, `_4K`). Files **without** these labels are assumed to be universal and will not be flagged, even if they are actually cabinet-only. Modern VPW releases almost always label themselves correctly; older tables are generally universal. This is a known limitation until VPS adds a structured build type field per file.

### RAR Files Are Not Supported
The browser cannot natively decompress `.rar` archives. Select `.zip`, `.vpx`, `.directb2s`, `.pov`, `.png`, `.jpg`, or video files only. Extract RAR archives manually first, then use Install Files.

### Setup Type Change Does Not Re-Process Staged Files
Switching between Cabinet and Desktop mode only affects the **next** time you open Install Files. If you change setup type while the install plan is already open, close it and re-open Install Files to re-evaluate the files against your new setup type. (Post-packaging: Electron will enable auto-reprocessing.)

### ZIPs With No Recognized Content Fall Through to ROM
If a ZIP does not contain `.vpx`, `.directb2s`, `.pov`, `.dif`, alt color/sound markers, or PuP Pack folder names, it is classified as a ROM and moved to `VPinMAME\roms\`. If that is wrong, move the file manually.

### VPU Remix Patches (.dif) Are Manual-Only
ZIPs containing `.dif` files require the external **VPUPatcher64** tool from vpuniverse.com. The app shows instructions but cannot auto-install these patches.

---

## Popper Integration

### Popper Must Be Fully Closed Before DB Writes
Writing to `PUPDatabase.db` while PinUp Popper is running can corrupt the database. The app prompts you to confirm Popper is closed, but it cannot verify this automatically (browser limitation). Post-packaging with Electron: the app will check for the Popper process directly.

### Popper Registration Matching May Miss Non-Standard Filenames
Registration detection compares a compact (stripped) version of the VPX filename against what Popper stored in `GameFileName`. If Popper's entry was manually edited to a completely different name, the badge may incorrectly show "not in Popper". Re-scanning the Popper DB after any manual edits will refresh the state.

### SQL Script Fallback Requires DB Browser for SQLite
If the Popper DB path is not set, the app downloads a `popper_import.sql` file. To apply it: open `PUPDatabase.db` in **DB Browser for SQLite**, go to Execute SQL tab, paste the script, press F5, then click Write Changes. Always backup the DB first.

---

## PuP Packs

### PuP Pack Button Is for Extracted Folders Only
The **🎮 PuP Pack** button uses a folder picker — select the already-extracted PuP Pack folder (e.g. `Aladdin\`). If you have a PuP Pack as a `.zip` file, use **📥 Install Files** instead — ZIP files are auto-detected and extracted automatically.

### PuP Pack Patches Merge Into Existing Folders
ZIPs or folders identified as patches (name contains "patch" or "update") are merged into the existing `PUPVideos\{tablename}\` folder, overwriting any files with the same names. Full PuP Packs create a new subfolder.

---

## Path Setup

### Auto-detect Requires the Right Root Folder
Auto-detect scans **downward** from whatever folder you pick. You must pick a folder that contains both `VisualPinball` and `PinUPSystem` as direct or nested subfolders — typically `C:\vPinball` or `C:\vPinball\VisualPinball`. If you pick a subfolder like `VPinMAME`, `Tables`, or `roms`, only paths within that branch will be found and most paths will show "not found". The modal warns you if it detects the selected folder looks too deep.

---

## Scanning & Detection

### Tables Folder Scan Must Be Run After Every Install
Installed badges, version detection, duplicate detection, and Popper registration status are all based on the last scan. After installing new files, click **Re-scan** to update all badges. (Post-packaging with Electron: file system watching will enable automatic re-scan.)

### Binary Version Extraction May Miss Some Tables
The app reads `cVersion` and `cGameName` from the first 4MB and last 2MB of each VPX file. Tables where the VBScript falls outside these regions (extremely rare) will fall back to filename-based version detection. Many modern VPW releases do not define `cVersion` at all — filename version is correct for those.

### ROM Matching Is Exact Then Same-Family
ROM detection first looks for an exact filename match (e.g. `bop_l7.zip`). If not found, it looks for same-family ROMs (e.g. `bop_l8.zip` for a table needing `bop_l7`) and offers to rename on install. If neither is present, the ROM is reported as missing.

### ROM Name in Table Detail May Not Match the Specific VPX Version
The ROM name shown on each version row in the table detail panel comes from the **VPS community database**, which stores one ROM entry per table — not one per VPX version. If a newer VPX version requires a different ROM revision than what VPS lists (e.g. VPS says `tom_13` but v2.4 of the table requires `tom_14hb`), the detail panel will show the stale VPS value. **This is a VPS data quality issue, not a PinballMagic bug.** The install plan compensates automatically: if you drop a same-family ROM alongside the VPX, PinballMagic detects the mismatch and offers to rename the ROM to the correct version during install.

---

## Browser Limitations (Resolved Post-Packaging)

### Chrome or Edge Required
The File System Access API (`showDirectoryPicker`, `showOpenFilePicker`, `createWritable`) is not supported in Firefox or Safari. Use **Google Chrome** or **Microsoft Edge**.

### OS Special Folders Cannot Be Picked as Destinations
`showDirectoryPicker` is blocked on Windows special folders (Downloads, Desktop, Documents, OneDrive roots). Your `Tables`, `roms`, `POPMedia`, and `PUPVideos` folders should be under a standard path like `C:\vPinball\` with no special-folder restrictions.

### All Folder Permissions Reset on Browser Restart
The browser may revoke folder access handles after a full browser restart (not just a tab reload). If paths show as "not selected" after restarting Chrome/Edge, click **Auto-detect** to re-grant access in one step. (Post-packaging: Electron eliminates this entirely.)

### VPS Database and Scan Results Stored in IndexedDB
If you clear browser site data for the local file URL, all cached data (VPS database, scan results, folder handles, diff history, settings) will be lost. Use **Update Now** to re-fetch the VPS database and **Re-scan** to restore scan state. (Post-packaging: data stored in the app's own directory.)

---

## General

### Backup Rotation Keeps Only 3 Copies
The `PinballMagic\Backups\` folder auto-prunes to the 3 most recent `PUPDatabase.db` backups. If you need to keep more, copy backups to another location manually before they are pruned.

### "Recently Updated" Uses VPS Timestamps, Not Install Date
The Recently Updated tile and sort show tables where the **VPS database** has had file activity in the last 90 days — not tables you recently installed. A table you installed 2 years ago can appear as "recently updated" if the VPS community uploaded a new version this week.

### Duplicate VPX Detection Uses Compact Name Matching
Two VPX files are considered duplicates if their filenames reduce to the same compact string after stripping version numbers, years, manufacturer names, and punctuation. Very short table names (e.g. "24") could theoretically create false duplicate groupings if another unrelated file compacts to the same string — check both filenames before deleting.

---

## Media Badges

### "no bg media" Badge Is Informational Only
The dim grey **no bg media** badge means the table has no backglass video in Popper's `POPMedia\BackGlass\` folder — this is the video Popper plays on the backglass screen while browsing. It is **not** related to the `.directb2s` file (which is shown separately as `✓ b2s`). Popper media videos are sourced from **VPinUniverse** (vpuniverse.com) and cannot be downloaded from within this app. No action is required — the table will still play correctly in Visual Pinball; only the Popper media screen will be blank for that table.
