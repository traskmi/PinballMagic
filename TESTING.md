# PinballMagic — Comprehensive Test Plan
**App version: v2.23.0** | Last updated: 2026-05-25

Files referenced below already exist in `C:\vPinball\PinballMagic\Downloads\` unless noted.

---

## PHASE 1 — App Startup & VPS Database

### 1.1 First Load
- Open `index.html` in Chrome/Edge
- **Expect:** Dark themed app, logo "🎱", title "Virtual Pinball Magic Downloader v2.23.0"
- **Expect:** A "Load VPS Database" panel prompting you to load or update the database
- **Expect:** DB status shows last-updated date and whether it is fresh or stale (⚠️ if > 7 days old)

### 1.2 Update VPS Database
- Click **Update Now**
- **Expect:** Progress bar animates, then "2,500+ tables loaded" (or similar count)
- **Expect:** Status line shows today's date
- **Expect:** Table list appears, stat tiles show total table count
- **Expect:** "See what changed →" link appears with ✨ N new / 🔄 N updated counts

### 1.3 VPS Diff Popup
- Click **"See what changed →"**
- **Expect:** Modal opens showing new tables (teal) and updated tables (amber) from the most recent fetch
- Close the popup

### 1.4 Changelog
- Click the **v2.23.0** pill in the top-right header
- **Expect:** Changelog modal opens, lists recent versions with bullet points
- Close it

---

## PHASE 2 — Setup Type (Cabinet vs Desktop)

### 2.1 Set Cabinet Mode
- In the **Install Paths** panel, find the "Your setup:" row
- Click **🎰 Cabinet**
- **Expect:** Button turns purple/highlighted
- **Expect:** Hint text reads "Cabinet — Desktop/FSS build files will be flagged and deselected"

### 2.2 Set Desktop Mode
- Click **🖥 Desktop**
- **Expect:** Desktop button becomes active, Cabinet deselects
- **Expect:** Hint text reads "Desktop — Cabinet build files will be flagged and deselected"

### 2.3 Toggle Off
- Click the active button again
- **Expect:** Both buttons deselect, hint text returns to the neutral explanation
- Set it back to **Cabinet** (or your actual setup) before continuing

---

## PHASE 3 — Install Paths Setup

### 3.1 Auto-Detect
- Click **Auto-detect** in the Install Paths panel header
- When prompted, pick your root `vPinball` or `VisualPinball` folder (e.g. `C:\vPinball\`)
- **Expect:** Modal shows a checklist of paths found (✅ or —)
  - ✅ Tables folder → `VisualPinball\Tables`
  - ✅ Downloads folder → `PinballMagic\Downloads`
  - ✅ ROMs folder → `VPinMAME\roms`
  - ✅ Alt Color → `VPinMAME\altcolor`
  - ✅ Alt Sound → `VPinMAME\altsound`
  - ✅ POPMedia → `PinUPSystem\POPMedia\Visual Pinball X`
  - ✅ PuP Videos → `PinUPSystem\PUPVideos`
  - ✅ Popper DB → `C:\PinUPSystem\PUPDatabase.db`
- Click **Apply** 
- **Expect:** All path rows in the panel update to show full folder paths with green dot indicators

### 3.2 Verify Individual Paths
- Check each path row in the Install Paths panel shows the correct folder name
- Full path should be visible (e.g. `vPinball\VisualPinball\Tables` not just `Tables`)
- Hover any long path — tooltip should show the full path

### 3.3 Manual Path Change (spot check)
- Click **change** next to any one path row (e.g. Downloads)
- Pick the same folder again
- **Expect:** Row updates, no error

---

## PHASE 4 — Scanning

### 4.1 Scan Tables Folder
- Click **Scan Tables Folder** button
- **Expect:** Button shows `⏳ 1/62` counter while scanning
- **Expect:** After completion: "Scanned X .vpx files — Y/X have binary version · Z/X have author · just now"
- **Expect:** Installed stat tile number increases, badge colors update in table list

### 4.2 Verify Binary Version Extraction
- Find table **24** in the list (search "24")
- **Expect:** Installed badge shows **✓ v2.3.1** (actual binary version, not just "✓ installed")

### 4.3 Scan ROM Folder
- After the Tables scan, look for tables with ROMs (e.g. **24**)
- **Expect:** ROM badge shows **✓ rom** (teal) if `twst_405.zip` or equivalent is in your roms folder
- **Expect:** ROM badge shows grey `rom` if ROM is missing

### 4.4 Scan Popper Database
- The Popper DB scan runs automatically when the path is set
- **Expect:** Log shows "Popper scan: N VPX table(s) registered in PUPDatabase.db"
- **Expect:** Tables confirmed in Popper show **no** "not in Popper" badge
- Verify **24** no longer shows "⚠ not in Popper" (this was the bug fixed in v2.23.0)
- Verify **Adventures of Rocky and Bullwinkle and Friends** also shows correctly

---

## PHASE 5 — Browse & Filter

### 5.1 Total Tile
- Click the **Total** stat tile
- **Expect:** Filter clears, all tables visible, tile highlighted

### 5.2 Installed Tile
- Click the **Installed** stat tile
- **Expect:** Only installed tables shown; tile highlighted with teal border

### 5.3 Missing Only Tile
- Click the **Missing** stat tile
- **Expect:** Only tables NOT installed shown

### 5.4 Not in Popper Tile
- Click the **Not in Popper** tile (only visible after Popper DB scan)
- **Expect:** Shows only installed tables that are NOT registered in PUPDatabase.db

### 5.5 Recently Updated Tile
- Click the **Recently Updated** tile (teal, 90-day window)
- **Expect:** Table list filtered to tables updated in VPS in the last 90 days
- **Expect:** Sort also switches to "Recently Updated" (newest first)

### 5.6 Duplicates Tile
- Click the **Duplicates** tile (only visible after scan if duplicates exist)
- **Expect:** Shows only tables where 2+ VPX files map to the same compact name

### 5.7 Filter Bar — All / Missing / Installed Buttons
- Click **Missing only** → only missing tables
- Click **Installed** → only installed tables
- Click **All** → all tables
- **Expect:** Count label above list updates correctly each time

### 5.8 Manufacturer Filter
- Open the **All manufacturers** dropdown
- Select **Stern**
- **Expect:** Table list filters to Stern tables only; count updates
- Verify **24 (Stern 2009)** is present; **Playboy (Bally 1978)** is absent
- Reset to All manufacturers

### 5.9 Year Range Filter
- Type **1990** in the "Year from" box and **1999** in the "Year to" box
- **Expect:** Only tables from the 1990s appear
- Try **2009** in both — only 2009 tables should show
- Clear both fields to reset

### 5.10 Search — Table Name
- Type **playboy** in the search box
- **Expect:** All Playboy variants appear (Bally 1978, Data East 1989, Stern 2002)
- **Expect:** Count label reflects filtered count

### 5.11 Search — Creator Name
- Clear search, type **jpsalas**
- **Expect:** Tables where JPSalas is listed as a creator appear

### 5.12 Sort — A–Z
- Select **Sort: A–Z** from dropdown
- **Expect:** List sorted alphabetically (0–9 before A, or A before Z)

### 5.13 Sort — Year (newest)
- Select **Sort: Year (newest)**
- **Expect:** Most recent tables (2025–2026 Original) appear first; 1970s at bottom

### 5.14 Sort — Recently Updated
- Select **Sort: Recently Updated**
- **Expect:** Tables with most recent VPS `updatedAt` timestamp appear first
- **Expect:** Recently Updated stat tile activates

### 5.15 Disabled Dropdown Entry
- Open sort dropdown
- **Expect:** "⭐ Best Of (coming soon)" appears as a disabled, non-selectable option

---

## PHASE 6 — Table Detail Panel

### 6.1 Open Detail for Installed Table
- Click anywhere on the **24** row
- **Expect:** Detail panel expands below the row
- **Expect:** VPS metadata shown: manufacturer, year, creators list
- **Expect:** Installed badge **✓ v2.3.1** appears prominently

### 6.2 Version List
- In the 24 detail panel, find the version list under "Available versions"
- **Expect:** Each version shows: filename, version number, date (e.g. `· May 2025`)
- **Expect:** Installed version is highlighted (different row background or border)

### 6.3 ROM Badge in Detail
- Look at the ROM section
- **Expect:** ROM name shown (e.g. `twst_405`)
- **Expect:** Status: ✅ installed / ⚠️ compatible revision / ⚠️ not installed

### 6.4 B2S Badge
- **Expect:** B2S badge shows ✓ b2s (teal) if a .directb2s is in Tables folder, grey otherwise

### 6.5 "Not in Popper" Badge in Detail
- Find a table that IS in Popper (e.g. 24) — **no** orange "not in Popper" badge
- Find a newly installed table not yet written to Popper — orange "⚠ not in Popper" badge

### 6.6 Update Badge
- Find a table where VPS has a newer version than installed
- **Expect:** Row shows **🔄 vX.X · Month Year** badge in purple
- Hover the badge — tooltip shows "You have: vX.X · Newer: vX.X"

### 6.7 Duplicate Badge
- If duplicates were detected, find a table with duplicates
- **Expect:** Yellow warning in detail panel listing both files with individual "Delete" buttons

### 6.8 VPS Links
- In a detail panel, click a download link for a table file
- **Expect:** Browser opens VPS download page / direct download

---

## PHASE 7 — Install Flow: File Classification

For each test below, click **Install Files**, select the file(s) from the Downloads folder, and check the generated install plan.

### 7.1 Standalone VPX File
**File:** `Playboy 35th Anniversary (Data East 1989) Physics Sound Hybrid MOD 1.1.vpx`
- Select it via Install Files
- **Expect:** Install plan shows 1 item with **VPX** pill (purple)
- **Expect:** Destination: Tables folder
- **Expect:** Rename info: target filename matches VPX base name in Tables

### 7.2 Cabinet VPX File (Cabinet setup)
**File:** `Playboy (Stern 2002) v1.75_CAB.vpx`
- With setup type set to **Cabinet**, select this file
- **Expect:** No mismatch warning (it's a cabinet build for a cabinet setup)
- With setup type set to **Desktop**, select this file
- **Expect:** ⚠️ orange mismatch warning in install plan card: "Cabinet build · File deselected"

### 7.3 Desktop ZIP (Cabinet Setup)
**File:** `Playboy (Stern 2002) v1.75_Desktop.zip`
- With setup type set to **Cabinet**, select this ZIP
- **Expect:** ⚠️ mismatch warning: "Desktop build · File deselected — re-check to install anyway"
- **Expect:** Item checkbox is unchecked by default

### 7.4 Table ZIP (standard)
**File:** `Playboy (Bally 1978).zip`
- **Expect:** Plan shows **Table ZIP** pill, lists contents (VPX, maybe B2S, ROM)
- **Expect:** Each extracted file has its own colored pill: VPX (purple), ROM (amber), Backglass (teal)

### 7.5 Backglass ZIP
**File:** `Playboy 35th Anniversary (Data East 1989) directb2s.zip`
- **Expect:** Classified as **Backglass ZIP** (teal pill)
- **Expect:** Destination: Tables folder
- **Expect:** Rename: `Playboy 35th Anniversary (Data East 1989)...directb2s` → matches installed VPX basename

### 7.6 Standalone .directb2s Files
**Files:** Select all three at once:
- `Rocky (Gottlieb 1982).directb2s`
- `Theatre of Magic (Bally 1995).directb2s`
- `Torpedo (Petaco 1976) authentic.directb2s`
- **Expect:** Each shows **Backglass** pill (teal), destination Tables folder
- **Expect:** Rename to match corresponding installed VPX basename

### 7.7 ROM ZIP
**Files:** `playboyb.zip`, `playboys.zip`, `play_a24.zip`
- **Expect:** Each classified as **ROM** pill (amber/gold)
- **Expect:** Destination: VPinMAME\roms\
- **Expect:** Status shows ✅ "already installed" if already in roms folder, or install action

### 7.8 Wheel Image
**File:** `Killer Instinct - Davadruix's wheel.png`
- **Expect:** Classified as **Wheel** (grey pill)
- **Expect:** Destination: POPMedia\…\Wheel\
- **Expect:** Rename: matches VPS table name for Killer Instinct

### 7.9 Multiple Files Mixed Batch
- Select ALL of the following at once:
  - `Playboy (Bally 1978).zip`
  - `playboyb.zip`
  - `playboys.zip`
  - `Rocky (Gottlieb 1982).directb2s`
  - `Killer Instinct - Davadruix's wheel.png`
- **Expect:** Plan groups files by table (Playboy Bally, ROM entries, Rocky backglass, KI wheel)
- **Expect:** Each item has a correctly colored pill
- **Expect:** Correct destination paths per file type
- **Expect:** Per-item checkboxes are all checked by default

### 7.10 RAR File (Unsupported)
**Files:** `Adventures of Rocky and Bullwinkle and Friends.rar`, `Torpedo Alley (Data East 1988).rar`
- Select them via Install Files
- **Expect:** These files are either silently skipped or shown with a warning — NOT classified as a valid type
- *(RAR is not natively supported by the browser — these should not crash the app)*

---

## PHASE 8 — Install Flow: Conflict Resolution

### 8.1 Multiple VPX Versions for Same Table
**Files:** Select both:
- `Playboy (Stern 2002) v1.75_Desktop.zip`
- `PLAYBOY (STERN 2002).zip`
- **Expect:** Install plan shows a conflict picker: "Multiple versions found for Playboy (Stern 2002) — pick one"
- **Expect:** Radio buttons for each file + a "Skip — don't install" option
- Select one, confirm — **Expect:** Only chosen file moves to Tables

### 8.2 Multiple Backglass Files
**Files:** Select:
- `Magic (Stern 1979) dB2S.zip`
- Any other Magic B2S if you have one
- **Expect:** Backglass conflict picker: "Multiple backglass files for Magic — pick one"

### 8.3 Per-Item Checkbox
- Open any install plan with multiple items
- Uncheck one item
- **Expect:** Unchecked item is skipped during install (does not appear in summary)

---

## PHASE 9 — Build Type Mismatch (with Cabinet setup active)

Set setup type to **Cabinet** before this phase.

### 9.1 Desktop Build Detected and Flagged
- Select `Playboy (Stern 2002) v1.75_Desktop.zip`
- **Expect:** The card border turns amber
- **Expect:** Warning box inside card: "⚠ Desktop build — File deselected — re-check to install anyway"
- **Expect:** Checkbox unchecked

### 9.2 Override and Install Anyway
- Re-check the checkbox manually on the mismatch item
- Click **Install Now**
- **Expect:** File installs despite mismatch (user override works)

---

## PHASE 10 — Completing an Install

### 10.1 Full Install — Single Table
- Select `Playboy (Bally 1978).zip` (clean table for a table not yet installed)
- Review the plan — confirm paths, pills, and rename look correct
- Click **Install Now**
- **Expect:** Progress shown during copy/extract
- **Expect:** Summary modal appears: "Installed N files"
- **Expect:** Lists moved/extracted files with destinations
- **Expect:** Popper section appears with direct write button or SQL download (depending on popperDbHandle)

### 10.2 Post-Install Re-scan
- After install, click **Scan Tables Folder**
- **Expect:** Newly installed table now shows **✓ installed** badge in the list
- **Expect:** Installed count tile increments

### 10.3 Install Summary — Previous Version Cleanup
- Install an **update** (newer version of an already-installed table)
- **Expect:** Summary shows "Previous version detected" section
- **Expect:** Old filename listed with a **Delete** button
- Click Delete — **Expect:** Button changes to "✓ Deleted"
- **Expect:** Cleanup section shows a "Remove from Popper" button or SQL download for the old entry

---

## PHASE 11 — Popper Database Integration

### 11.1 Direct DB Write — New Table
- After installing a new table (Phase 10.1), the summary should show:
  - If `popperDbHandle` is set: **📝 Write to Popper** button + "or download SQL" fallback link
  - If not set: only the SQL download link + "Backup DB first" button
- Click **Write to Popper**
- **Expect:** Confirm dialog: "Please make sure PinUp Popper is fully closed..."
- Click **OK**
- **Expect:** Status shows "✅ 1 game registered · 0 old entries removed"
- **Expect:** Table's "not in Popper" badge disappears after write

### 11.2 Verify in Popper App
- Open PinUp Popper → GamesSetupForm → All Games
- **Expect:** Newly installed table appears with correct GameDisplay, GameFileName, Manufacturer, Year
- **Expect:** EMUID matches your Visual Pinball X emulator entry

### 11.3 SQL Fallback Download
- Click **"or download SQL"** (or the main download link if no Popper DB handle)
- **Expect:** `popper_import.sql` downloads
- Open it in a text editor — verify it contains `INSERT OR IGNORE INTO Games` with correct values

### 11.4 Cleanup SQL
- After replacing an old table, in the "Previous version" section:
  - If Popper DB handle set: **🗑 Remove from Popper** button
  - Always: **🗑 Download popper_cleanup.sql** link
- Click **Remove from Popper** (or download and review the SQL)
- **Expect:** Old entry removed from PUPDatabase.db
- **Expect:** Open Popper to verify old entry is gone

### 11.5 DB Backup — From Paths Panel
- Click **Backup DB** in the Install Paths panel
- **Expect:** Backup written to `PinballMagic\Backups\PUPDatabase_backup_YYYY-MM-DD_HH-MM-SS.db`
- **Expect:** Status shows "1/3 copies in Backups\" (or 2/3, 3/3 on subsequent runs)
- Run 4 times total — **Expect:** Only 3 copies kept (oldest auto-deleted)

### 11.6 Popper Registration Detection (Bug Fix Verification)
- Ensure Tables folder is scanned and Popper DB is scanned
- Find **24** in the table list
- **Expect:** No "⚠ not in Popper" badge (it IS in Popper as "24 (Stern 2009) v.2.3.1")
- Find **Adventures of Rocky and Bullwinkle and Friends** — also verify badge is correct

---

## PHASE 12 — Duplicate VPX Detection

### 12.1 Detect Duplicates
- If two .vpx files in Tables both compact to the same name, the **Duplicates** tile shows a count > 0
- Click the Duplicates tile
- **Expect:** Only tables with duplicate VPX files shown

### 12.2 View Duplicate Detail
- Click a table with duplicates
- **Expect:** Detail panel shows "⚠ Duplicate files detected" with both filenames listed
- **Expect:** Each has a **Delete** button

### 12.3 Delete a Duplicate
- Click **Delete** on the older/unwanted duplicate
- **Expect:** Button changes to "✓ Deleted" or "— not found"
- Re-scan Tables folder
- **Expect:** Duplicate count decreases

---

## PHASE 13 — Activity Log

### 13.1 Open Log
- Click **📋 Log** in the toolbar
- **Expect:** Panel opens with timestamped entries for every scan, install, move, backup operation

### 13.2 Verbose Mode
- Toggle **Verbose/debug** in the log panel
- Re-scan or do an install
- **Expect:** Detailed entries appear: byte counts, ZIP entry lists, VPS lookup hits/misses

### 13.3 Download Log
- Click **💾 Download .log**
- **Expect:** `pinballmagic_YYYY-MM-DD.log` downloads, opens in a text editor with all entries

---

## PHASE 14 — VPS Diff History

### 14.1 Persistent Diff
- Note the diff counts (✨ N new / 🔄 N updated) shown after an update
- Reload the page (F5)
- **Expect:** Diff counts still appear (persisted in IndexedDB)

### 14.2 History Depth
- Click **"See what changed →"**
- **Expect:** Multiple past updates listed (newest first) if you've updated more than once
- Change "Keep last N updates" to 2 → close and reopen → **Expect:** Only 2 entries kept

---

## PHASE 15 — Edge Cases

### 15.1 VPU Remix .dif Patch
- If you have a ZIP containing a `.dif` file, select it
- **Expect:** Plan shows a red-bordered "Manual only" section
- **Expect:** Instructions shown: "Use VPUPatcher64 — no auto-install"
- **Expect:** No Install button for this item; rest of batch still installs

### 15.2 Empty or Unrecognized ZIP
- Select `DT-res-files.zip`
- **Expect:** App classifies it (likely as ROM, or shows contents) — does not crash
- Check what's actually inside it to verify the classification is correct

### 15.3 Install With No Folder Paths Set
- Clear the Tables path (or test in a fresh browser profile)
- Try to install a file
- **Expect:** App prompts you to set the path before proceeding, or shows an error — does not crash

### 15.4 Cancel Install Plan
- Open an install plan with multiple files
- Click **Cancel** (or the ✕ button)
- **Expect:** Modal closes, no files are moved
- **Expect:** Clicking outside the modal does NOT close it (sticky modal behavior)

### 15.5 ROM Same-Family Rename
- Find a table whose ROM is `bop_l7` but you have `bop_l8.zip` in your selection
- **Expect:** Plan shows "✅ Will be installed as bop_l7.zip (same game, different revision)"
- Install it — **Expect:** File written as `bop_l7.zip` in roms folder

---

## PHASE 16 — Regression Checks

After all testing, do these final verification passes:

| Check | Expected |
|---|---|
| Backglass for Bally 1978 Playboy does NOT appear in Stern 2002 Playboy | No cross-table B2S false match |
| "Analyzing" (not "Analysing") in all scan status messages | Correct US spelling |
| Setup type preference survives page reload | localStorage persists cabinet/desktop choice |
| All folder handles survive page reload | No re-prompts for paths already set |
| Stat tiles update correctly after install without manual rescan | updateStats() fires post-install |
| Version pill in sort dropdown shows "Sort: A–Z" as default | Default sort preserved |
| "Not in Popper" tile hidden until Popper DB is scanned | Tile display:none before popperScanDone |

---

## Test Environment
- Browser: Chrome or Edge (Chromium) — **not Firefox** (no File System Access API)
- Cabinet folder: `C:\vPinball\VisualPinball\Tables\`
- Popper DB: `C:\PinUPSystem\PUPDatabase.db`
- App: `C:\vPinball\PinballMagic\index.html`
