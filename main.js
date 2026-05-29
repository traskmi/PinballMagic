const { app, BrowserWindow, shell, Menu, ipcMain, dialog, session, net } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'PinballMagic',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    backgroundColor: '#0a0a14',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Remove the default menu bar (File/Edit/View/...) — not needed for this app
  Menu.setApplicationMenu(null);

  win.loadFile(path.join(__dirname, 'index.html'));

  // Auto-grant file system and clipboard permissions so showDirectoryPicker doesn't hang
  win.webContents.session.setPermissionRequestHandler((wc, permission, callback) => {
    callback(true);
  });

  // Open all target="_blank" links in the system browser, not a new Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Dev-only shortcuts (Ctrl+R = reload, Ctrl+Shift+I = DevTools) — disabled in packaged builds
  if (!app.isPackaged) {
    win.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.key === 'r') {
        win.webContents.reload();
        event.preventDefault();
      }
      if (input.control && input.shift && input.key === 'I') {
        win.webContents.toggleDevTools();
        event.preventDefault();
      }
    });
  }
}

// Native file picker — returns array of selected paths (empty if cancelled)
ipcMain.handle('dialog:openFiles', async (event, opts = {}) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    title: opts.title || 'Select pinball files',
    filters: [{ name: 'Pinball files', extensions: ['vpx','directb2s','pov','pdf','zip','rar','png','jpg','jpeg','apng','mp4','f4v','mkv','mp3','wav'] }],
  });
  return result.canceled ? [] : result.filePaths;
});

// Native folder picker — returns selected path or null if cancelled
ipcMain.handle('dialog:openDirectory', async (event, opts = {}) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: opts.title || 'Select folder',
    defaultPath: opts.defaultPath || undefined,
  });
  return result.canceled ? null : result.filePaths[0];
});

const fs = require('fs');
const fsPath = require('path');

// Read directory entries — returns array of { name, isDirectory }
ipcMain.handle('fs:readdir', async (event, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map(e => ({ name: e.name, isDirectory: e.isDirectory() }));
  } catch(e) { return null; }
});

// Check if a path exists
ipcMain.handle('fs:exists', async (event, p) => fs.existsSync(p));

// Create directory (mkdir -p equivalent)
ipcMain.handle('fs:mkdir', async (event, p) => {
  try { fs.mkdirSync(p, { recursive: true }); return true; } catch(e) { return false; }
});

// Read a file as a base64 string (for binary files like SQLite DB)
ipcMain.handle('fs:readFile', async (event, p) => {
  try { return fs.readFileSync(p).toString('base64'); } catch(e) { return null; }
});

// Write a file from a base64 string
ipcMain.handle('fs:writeFile', async (event, p, dataBase64) => {
  try { fs.writeFileSync(p, Buffer.from(dataBase64, 'base64')); return true; } catch(e) { return false; }
});

// Copy a file
ipcMain.handle('fs:copyFile', async (event, src, dest) => {
  try { fs.mkdirSync(fsPath.dirname(dest), { recursive: true }); fs.copyFileSync(src, dest); return true; } catch(e) { return false; }
});

// Delete a file
ipcMain.handle('fs:unlink', async (event, p) => {
  try { fs.unlinkSync(p); return true; } catch(e) { return e.code === 'ENOENT' ? 'notfound' : false; }
});

// Get file size and mtime
ipcMain.handle('fs:stat', async (event, p) => {
  try { const s = fs.statSync(p); return { size: s.size, isDirectory: s.isDirectory(), mtime: s.mtimeMs }; } catch(e) { return null; }
});

// Read a portion of a file as base64 (for VPX version extraction)
ipcMain.handle('fs:readPartial', async (event, p, offset, length) => {
  try {
    const fd = fs.openSync(p, 'r');
    const buf = Buffer.alloc(length);
    const bytesRead = fs.readSync(fd, buf, 0, length, offset);
    fs.closeSync(fd);
    return buf.slice(0, bytesRead).toString('base64');
  } catch(e) { return null; }
});

// List ZIP entry filenames by reading only the central directory (no decompression)
ipcMain.handle('fs:listZip', async (event, p) => {
  const EOCD_SIG = 0x06054b50;
  const CDR_SIG  = 0x02014b50;
  const ZIP64_EOCD_SIG = 0x06064b50;
  try {
    const stat = fs.statSync(p);
    const fileSize = stat.size;
    if (fileSize < 22) return null;
    const searchSize = Math.min(65536 + 22, fileSize);
    const tail = Buffer.alloc(searchSize);
    const fd = fs.openSync(p, 'r');
    fs.readSync(fd, tail, 0, searchSize, fileSize - searchSize);
    // Find EOCD signature scanning backward
    let eocdPos = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === EOCD_SIG) { eocdPos = i; break; }
    }
    if (eocdPos < 0) { fs.closeSync(fd); return null; }
    let cdOffset = tail.readUInt32LE(eocdPos + 16);
    let cdSize   = tail.readUInt32LE(eocdPos + 12);
    // ZIP64 support: if values are 0xffffffff, look for ZIP64 EOCD locator
    if (cdOffset === 0xffffffff || cdSize === 0xffffffff) {
      const loc64Pos = eocdPos - 20;
      if (loc64Pos >= 0 && tail.readUInt32LE(loc64Pos) === 0x07064b50) {
        const eocd64Offset = Number(tail.readBigUInt64LE(loc64Pos + 8));
        const eocd64 = Buffer.alloc(56);
        fs.readSync(fd, eocd64, 0, 56, eocd64Offset);
        if (eocd64.readUInt32LE(0) === ZIP64_EOCD_SIG) {
          cdSize   = Number(eocd64.readBigUInt64LE(40));
          cdOffset = Number(eocd64.readBigUInt64LE(48));
        }
      }
    }
    if (cdSize <= 0 || cdOffset < 0) { fs.closeSync(fd); return null; }
    const cd = Buffer.alloc(cdSize);
    fs.readSync(fd, cd, 0, cdSize, cdOffset);
    fs.closeSync(fd);
    // Parse entry names from CDR
    const entries = [];
    let pos = 0;
    while (pos + 46 <= cdSize) {
      if (cd.readUInt32LE(pos) !== CDR_SIG) break;
      const fnLen = cd.readUInt16LE(pos + 28);
      const exLen = cd.readUInt16LE(pos + 30);
      const cmLen = cd.readUInt16LE(pos + 32);
      const flags = cd.readUInt16LE(pos + 8);
      const useUtf8 = (flags & 0x800) !== 0;
      entries.push(cd.toString(useUtf8 ? 'utf8' : 'latin1', pos + 46, pos + 46 + fnLen));
      pos += 46 + fnLen + exLen + cmLen;
    }
    return entries;
  } catch(e) { return null; }
});

// Extract ZIP entries matching filter extensions into destDir (flat — no subdirs preserved)
// options: { rootOnly: bool, pathPrefix: string } — rootOnly skips entries in subdirs;
// pathPrefix only includes entries under that subfolder path
// Returns array of { name, size } for each file written
ipcMain.handle('fs:extractZipFlat', async (event, zipPath, destDir, filterExts, options = {}) => {
  const yauzl = require('yauzl');
  const exts = filterExts ? new Set(filterExts.map(e => e.toLowerCase())) : null;
  const prefix = options.pathPrefix ? options.pathPrefix.toLowerCase().replace(/\/?$/, '/') : null;
  const rootOnly = !!options.rootOnly;
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zf) => {
      if (err) { reject(err); return; }
      const results = [];
      zf.readEntry();
      zf.on('entry', entry => {
        const parts = entry.fileName.replace(/\\/g, '/').split('/');
        const base = parts[parts.length - 1];
        if (!base) { zf.readEntry(); return; }
        const entryPath = entry.fileName.replace(/\\/g, '/').toLowerCase();
        if (prefix && !entryPath.startsWith(prefix)) { zf.readEntry(); return; }
        if (rootOnly && parts.length > 1) { zf.readEntry(); return; }
        const lower = base.toLowerCase();
        const ext = lower.includes('.') ? '.' + lower.split('.').pop() : '';
        if (exts && !exts.has(ext)) { zf.readEntry(); return; }
        zf.openReadStream(entry, (err2, stream) => {
          if (err2) { zf.readEntry(); return; }
          const dest = fsPath.join(destDir, base);
          fs.mkdirSync(fsPath.dirname(dest), { recursive: true });
          const out = fs.createWriteStream(dest);
          stream.pipe(out);
          out.on('finish', () => { results.push({ name: base, size: entry.uncompressedSize }); event.sender.send('extract:progress', { file: base, done: results.length }); zf.readEntry(); });
          out.on('error', () => zf.readEntry());
        });
      });
      zf.on('end', () => resolve(results));
      zf.on('error', reject);
    });
  });
});

// Extract all ZIP entries into destDir preserving paths, stripping an optional top-level prefix
// Returns count of files written
ipcMain.handle('fs:extractZipNested', async (event, zipPath, destDir, stripPrefix) => {
  const yauzl = require('yauzl');
  const prefix = stripPrefix ? stripPrefix.replace(/\/?$/, '/') : '';
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zf) => {
      if (err) { reject(err); return; }
      let count = 0;
      zf.readEntry();
      zf.on('entry', entry => {
        let rel = entry.fileName;
        if (prefix && rel.startsWith(prefix)) rel = rel.slice(prefix.length);
        if (!rel || rel.endsWith('/')) { zf.readEntry(); return; }
        zf.openReadStream(entry, (err2, stream) => {
          if (err2) { zf.readEntry(); return; }
          const dest = fsPath.join(destDir, rel.replace(/\//g, fsPath.sep));
          fs.mkdirSync(fsPath.dirname(dest), { recursive: true });
          const out = fs.createWriteStream(dest);
          stream.pipe(out);
          out.on('finish', () => { count++; event.sender.send('extract:progress', { file: rel.split('/').pop() || rel, done: count }); zf.readEntry(); });
          out.on('error', () => zf.readEntry());
        });
      });
      zf.on('end', () => resolve(count));
      zf.on('error', reject);
    });
  });
});

// List all .vpx files (and their sizes) in a directory — used for table scan
ipcMain.handle('fs:scanVpx', async (event, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
      .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.vpx'))
      .map(e => {
        try { return { name: e.name, size: fs.statSync(fsPath.join(dirPath, e.name)).size }; }
        catch(_) { return { name: e.name, size: 0 }; }
      });
  } catch(e) { return null; }
});

// List RAR entry filenames (no decompression — file-descriptor based read)
ipcMain.handle('fs:listRar', async (event, p) => {
  try {
    const { createExtractorFromFile } = require('node-unrar-js');
    const extractor = await createExtractorFromFile({ filepath: p });
    const list = extractor.getFileList();
    const entries = [];
    for (const header of list.fileHeaders) {
      if (!header.flags.directory) entries.push(header.name.replace(/\\/g, '/'));
    }
    return entries;
  } catch(e) { return null; }
});

// Extract RAR entries matching filter extensions into destDir (flat — no subdirs preserved)
// options: { rootOnly: bool, pathPrefix: string }
// Returns array of { name, size } for each file written
ipcMain.handle('fs:extractRarFlat', async (event, rarPath, destDir, filterExts, options = {}) => {
  try {
    const { createExtractorFromFile } = require('node-unrar-js');
    const exts = filterExts ? new Set(filterExts.map(e => e.toLowerCase())) : null;
    const prefix = options.pathPrefix ? options.pathPrefix.toLowerCase().replace(/\/?$/, '/') : null;
    const rootOnly = !!options.rootOnly;
    fs.mkdirSync(destDir, { recursive: true });
    const extractor = await createExtractorFromFile({
      filepath: rarPath,
      targetPath: destDir,
      filenameTransform: (filename) => filename.replace(/\\/g, '/').split('/').pop(),
    });
    const extracted = extractor.extract({
      files: (header) => {
        if (header.flags.directory) return false;
        const parts = header.name.replace(/\\/g, '/').split('/');
        const base = parts[parts.length - 1];
        if (!base) return false;
        const entryPath = header.name.replace(/\\/g, '/').toLowerCase();
        if (prefix && !entryPath.startsWith(prefix)) return false;
        if (rootOnly && parts.length > 1) return false;
        if (!exts) return true;
        const lower = base.toLowerCase();
        const ext = lower.includes('.') ? '.' + lower.split('.').pop() : '';
        return exts.has(ext);
      },
    });
    const results = [];
    for (const file of extracted.files) {
      const base = file.fileHeader.name.replace(/\\/g, '/').split('/').pop();
      results.push({ name: base, size: file.fileHeader.unpSize });
      event.sender.send('extract:progress', { file: base, done: results.length });
    }
    return results;
  } catch(e) { return null; }
});

// Route files from a 'medias/' subfolder inside a table archive to the correct POPMedia folders.
// Keyword routing: Wheel→Wheel/, backglass→BackGlass/, DMD→DMD/, Topper→Topper/, Playfield→PlayField/
// vpxBaseName: if provided, wheel/backglass images are renamed to match the VPX file.
// Returns { wheel:[], backglass:[], dmd:[], topper:[], playfield:[], skipped:[] }
ipcMain.handle('fs:extractArchiveMedias', async (event, archivePath, popmediaBase, vpxBaseName, pupvideosBase) => {
  const isRar = /\.rar$/i.test(archivePath);
  const MEDIA_EXTS = new Set(['.png','.jpg','.jpeg','.apng','.gif','.mp4','.f4v','.mkv','.mp3','.wav','.ogg','.flac']);
  const results = { wheel:[], backglass:[], dmd:[], topper:[], playfield:[], audio:[], skipped:[] };

  function getTargetSubfolder(filename, entryPath) {
    const f = filename.toLowerCase();
    const p = (entryPath || '').toLowerCase();
    if (/wheel/i.test(f))                           return 'Wheel';
    if (/backglass|back_glass|back glass/i.test(f)) return 'BackGlass';
    if (/\bdmd\b/i.test(f))                         return 'DMD';
    if (/topper/i.test(f))                          return 'Topper';
    if (/playfield|play_field|play field/i.test(f)) return 'PlayField';
    if (/\.(mp4|f4v|mkv)$/i.test(f))               return 'PlayField'; // unlabelled video → playfield
    if (/\.(mp3|wav|ogg|flac)$/i.test(f) || /music|audio|sound/i.test(p)) return 'Audio';
    return null;
  }

  function shouldRename(subfolder, filename) {
    return vpxBaseName && (subfolder === 'Wheel' || subfolder === 'BackGlass') &&
           /\.(png|jpg|jpeg|apng|gif)$/i.test(filename);
  }

  // Build list of media entries to process
  let entries = [];
  if (isRar) {
    const { createExtractorFromFile } = require('node-unrar-js');
    const ext = await createExtractorFromFile({ filepath: archivePath, targetPath: popmediaBase });
    const list = ext.getFileList();
    for (const h of list.fileHeaders) {
      const p = h.name.replace(/\\/g, '/').toLowerCase();
      if (!p.startsWith('medias/') || h.flags.directory) continue;
      const base = h.name.replace(/\\/g, '/').split('/').pop();
      const ext2 = '.' + base.split('.').pop().toLowerCase();
      if (MEDIA_EXTS.has(ext2)) {
        const sf = getTargetSubfolder(base, p);
        if (sf) entries.push({ path: h.name, base, subfolder: sf });
        else results.skipped.push(base);
      }
    }
    if (!entries.length) return results;
    const nonAudioEntries = entries.filter(e => e.subfolder !== 'Audio');
    const audioEntries    = entries.filter(e => e.subfolder === 'Audio');

    // Pass 1: media files (Wheel, BackGlass, DMD, Topper, PlayField) → POPMedia
    if (nonAudioEntries.length > 0) {
      const extractor = await createExtractorFromFile({
        filepath: archivePath,
        targetPath: popmediaBase,
        filenameTransform: (name) => {
          const entryLower = name.replace(/\\/g, '/').toLowerCase();
          const base2 = name.replace(/\\/g, '/').split('/').pop();
          const subfolder = getTargetSubfolder(base2, entryLower);
          if (!subfolder || subfolder === 'Audio') return base2; // safety net
          const destDir = fsPath.join(popmediaBase, subfolder);
          fs.mkdirSync(destDir, { recursive: true });
          const finalName = shouldRename(subfolder, base2) ? vpxBaseName + '.' + base2.split('.').pop() : base2;
          return fsPath.join(subfolder, finalName);
        },
      });
      const extracted = extractor.extract({ files: (h) => nonAudioEntries.some(e => e.path === h.name) });
      for (const f of extracted.files) {
        const entryLower = f.fileHeader.name.replace(/\\/g, '/').toLowerCase();
        const base2 = f.fileHeader.name.replace(/\\/g, '/').split('/').pop();
        const subfolder = getTargetSubfolder(base2, entryLower);
        const key = subfolder ? subfolder.toLowerCase() : null;
        if (key && results[key]) results[key].push(base2); else results.skipped.push(base2);
        event.sender.send('extract:progress', { file: base2, done: 1 });
      }
    }

    // Pass 2: audio files → PUPVideos\{tablename}\Movie\
    if (audioEntries.length > 0 && pupvideosBase && vpxBaseName) {
      const movieDir = fsPath.join(pupvideosBase, vpxBaseName, 'Movie');
      fs.mkdirSync(movieDir, { recursive: true });
      const extractor2 = await createExtractorFromFile({
        filepath: archivePath,
        targetPath: movieDir,
        filenameTransform: (name) => name.replace(/\\/g, '/').split('/').pop(),
      });
      const extracted2 = extractor2.extract({ files: (h) => audioEntries.some(e => e.path === h.name) });
      for (const f of extracted2.files) {
        const base2 = f.fileHeader.name.replace(/\\/g, '/').split('/').pop();
        results.audio.push(base2);
        event.sender.send('extract:progress', { file: base2, done: 1 });
      }
    } else if (audioEntries.length > 0) {
      audioEntries.forEach(e => results.skipped.push(e.base));
    }
  } else {
    const yauzl = require('yauzl');
    await new Promise((resolve, reject) => {
      yauzl.open(archivePath, { lazyEntries: true }, (err, zf) => {
        if (err) { reject(err); return; }
        zf.readEntry();
        zf.on('entry', entry => {
          const entryPath = entry.fileName.replace(/\\/g, '/');
          const lower = entryPath.toLowerCase();
          if (!lower.startsWith('medias/')) { zf.readEntry(); return; }
          const base2 = entryPath.split('/').pop();
          if (!base2) { zf.readEntry(); return; }
          const ext2 = '.' + base2.split('.').pop().toLowerCase();
          if (!MEDIA_EXTS.has(ext2)) { zf.readEntry(); return; }
          const subfolder = getTargetSubfolder(base2, lower);
          if (!subfolder) { results.skipped.push(base2); zf.readEntry(); return; }
          let destDir, finalName;
          if (subfolder === 'Audio' && pupvideosBase && vpxBaseName) {
            destDir   = fsPath.join(pupvideosBase, vpxBaseName, 'Movie');
            finalName = base2;
          } else if (subfolder === 'Audio') {
            results.skipped.push(base2); zf.readEntry(); return;
          } else {
            destDir   = fsPath.join(popmediaBase, subfolder);
            finalName = shouldRename(subfolder, base2) ? vpxBaseName + '.' + base2.split('.').pop() : base2;
          }
          fs.mkdirSync(destDir, { recursive: true });
          zf.openReadStream(entry, (err2, stream) => {
            if (err2) { zf.readEntry(); return; }
            const out = fs.createWriteStream(fsPath.join(destDir, finalName));
            stream.pipe(out);
            out.on('finish', () => {
              const key = subfolder.toLowerCase();
              (results[key] || results.skipped).push(finalName);
              event.sender.send('extract:progress', { file: finalName, done: 1 });
              zf.readEntry();
            });
            out.on('error', () => zf.readEntry());
          });
        });
        zf.on('end', resolve);
        zf.on('error', reject);
      });
    });
  }
  return results;
});

// Extract all RAR entries into destDir preserving paths, stripping an optional top-level prefix
// Returns count of files written
ipcMain.handle('fs:extractRarNested', async (event, rarPath, destDir, stripPrefix) => {
  try {
    const { createExtractorFromFile } = require('node-unrar-js');
    const prefix = stripPrefix ? stripPrefix.replace(/\/?$/, '/') : '';
    fs.mkdirSync(destDir, { recursive: true });
    const extractor = await createExtractorFromFile({
      filepath: rarPath,
      targetPath: destDir,
      filenameTransform: (filename) => {
        let rel = filename.replace(/\\/g, '/');
        if (prefix && rel.startsWith(prefix)) rel = rel.slice(prefix.length);
        return rel || filename.replace(/\\/g, '/').split('/').pop();
      },
    });
    const extracted = extractor.extract({ files: (header) => !header.flags.directory });
    let count = 0;
    for (const file of extracted.files) {
      count++;
      const fname = file.fileHeader.name.replace(/\\/g, '/').split('/').pop() || file.fileHeader.name;
      event.sender.send('extract:progress', { file: fname, done: count });
    }
    return count;
  } catch(e) { return null; }
});

// Watch the staging folder for new installable files
const STAGING_EXTS = new Set(['.vpx','.zip','.rar','.directb2s','.pov','.pdf','.png','.jpg','.jpeg','.apng','.mp4','.f4v','.mkv','.mp3','.wav']);

function countStagingFiles(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true })
      .filter(e => e.isFile() && STAGING_EXTS.has(fsPath.extname(e.name).toLowerCase()))
      .length;
  } catch(_) { return 0; }
}

let _stagingWatcher = null;
let _stagingDebounce = null;

ipcMain.handle('fs:watchStaging', async (event, p) => {
  if (_stagingWatcher) { try { _stagingWatcher.close(); } catch(_) {} _stagingWatcher = null; }
  if (!p) return 0;
  const sendCount = () => event.sender.send('staging:count', countStagingFiles(p));
  try {
    _stagingWatcher = fs.watch(p, { persistent: false }, () => {
      clearTimeout(_stagingDebounce);
      _stagingDebounce = setTimeout(sendCount, 400);
    });
    _stagingWatcher.on('error', () => {});
  } catch(_) {}
  return countStagingFiles(p);
});

// Open a file or folder in the system default app / file manager
ipcMain.handle('dialog:confirm', async (event, msg) => {
  const { response } = await dialog.showMessageBox({ type: 'question', buttons: ['Cancel', 'OK'], defaultId: 1, cancelId: 0, message: msg });
  return response === 1;
});
ipcMain.handle('shell:openPath', (event, p) => shell.openPath(p));
ipcMain.handle('shell:showItemInFolder', (event, p) => { shell.showItemInFolder(p); });

// Persistent session shared between the ROM login window and download cookie injection.
// Cookies are stored on disk and survive app restarts.
function romSession() { return session.fromPartition('persist:rom-sites'); }

// Open an embedded download window using the persistent ROM session.
// If a file download starts inside the window (user clicks Download on the site),
// it is intercepted and saved directly to destPath — the window closes automatically.
// If the user closes the window without downloading, resolves with { closed: true }.
ipcMain.handle('auth:openDownloadWindow', async (event, url, destPath, fileType) => {
  return new Promise((resolve, reject) => {
    const loginWin = new BrowserWindow({
      width: 1100, height: 800,
      webPreferences: { session: romSession(), nodeIntegration: false, contextIsolation: true },
      title: 'Log in if prompted, then click Download — window closes automatically when done',
      parent: BrowserWindow.getFocusedWindow() || undefined,
    });
    loginWin.setMenu(null);

    let captured = false;
    // Save session reference now — loginWin.webContents is destroyed by the time 'closed' fires
    const sess = romSession();

    const knownExts = /\.(vpx|directb2s|zip|rar|png|jpg|jpeg|apng|mp4|f4v|mkv|mp3|wav|dif)$/i;
    const onWillDownload = (e, item) => {
      const name = item.getFilename() || '';
      const total = item.getTotalBytes();
      const isRealFile = knownExts.test(name) || total > 10240 || total === 0;
      if (!isRealFile) { item.cancel(); return; }
      captured = true;
      sess.removeListener('will-download', onWillDownload);
      const stagingDir = destPath ? fsPath.dirname(destPath) : fsPath.join(require('os').homedir(), 'Downloads');
      // For ROMs: use VPS-derived destPath filename (VPinMAME needs exact name).
      // For everything else: use the actual server filename so RAR/ZIP/VPX is correct.
      const realName = (fileType === 'rom' && destPath) ? fsPath.basename(destPath) : (name || fsPath.basename(destPath || 'download.zip'));
      const saveTo = fsPath.join(stagingDir, realName);
      try { fs.mkdirSync(stagingDir, { recursive: true }); } catch(_) {}
      item.setSavePath(saveTo);
      item.on('updated', (_e, state) => {
        if (state === 'progressing') {
          const received = item.getReceivedBytes();
          const tot = item.getTotalBytes();
          try { if (tot > 0) event.sender.send('download:progress', { received, total: tot }); } catch(_) {}
        }
      });
      item.on('done', (_e, state) => {
        if (state === 'completed') {
          resolve({ size: item.getReceivedBytes(), filename: realName });
        } else {
          reject(new Error('Download ' + state));
        }
        if (!loginWin.isDestroyed()) loginWin.close();
      });
    };
    sess.on('will-download', onWillDownload);

    loginWin.on('closed', () => {
      sess.removeListener('will-download', onWillDownload);
      if (!captured) resolve({ closed: true });
    });

    loginWin.loadURL(url);
  });
});

// Returns true if the ROM session has any cookies for the given URL.
ipcMain.handle('auth:hasCookiesForUrl', async (event, url) => {
  const cookies = await romSession().cookies.get({ url });
  return cookies.length > 0;
});

// Clears all cookies for a site so the user can re-authenticate.
ipcMain.handle('auth:clearCookiesForUrl', async (event, url) => {
  try {
    const origin = new URL(url).origin;
    await romSession().clearStorageData({ origin, storages: ['cookies'] });
    return true;
  } catch(e) { return false; }
});

// Download a URL to a local file using Electron's net module with the ROM session.
// useSessionCookies:true means all cookies captured during login are sent automatically,
// exactly as a browser would — no manual cookie extraction needed.
ipcMain.handle('download:file', async (event, url, destPath) => {
  return new Promise((resolve, reject) => {
    const request = net.request({
      url,
      session: romSession(),
      useSessionCookies: true,
      redirect: 'follow',
    });
    request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    request.setHeader('Accept', '*/*');

    request.on('redirect', (_code, _method, _redirectUrl, _headers) => {
      request.followRedirect();
    });

    request.on('response', response => {
      if (response.statusCode !== 200) {
        reject(new Error('HTTP ' + response.statusCode)); return;
      }
      const ctRaw = response.headers['content-type'];
      const ct = (Array.isArray(ctRaw) ? ctRaw[0] : ctRaw || '').toLowerCase();
      if (ct.startsWith('text/html') || ct.startsWith('text/plain')) {
        reject(new Error('Server returned HTML instead of a file — login may be required')); return;
      }
      const clRaw = response.headers['content-length'];
      const total = parseInt(Array.isArray(clRaw) ? clRaw[0] : clRaw || '0');
      let received = 0;
      try { fs.mkdirSync(fsPath.dirname(destPath), { recursive: true }); } catch(_) {}
      const out = fs.createWriteStream(destPath);
      response.on('data', chunk => {
        received += chunk.length;
        if (total > 0) event.sender.send('download:progress', { received, total });
        out.write(chunk);
      });
      response.on('end', () => { out.end(); resolve({ size: received }); });
      response.on('error', err => { out.destroy(); reject(err); });
      out.on('error', reject);
    });

    request.on('error', reject);
    request.end();
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});
