const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require('electron');
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
// Returns array of { name, size } for each file written
ipcMain.handle('fs:extractZipFlat', async (event, zipPath, destDir, filterExts) => {
  const yauzl = require('yauzl');
  const exts = filterExts ? new Set(filterExts.map(e => e.toLowerCase())) : null;
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zf) => {
      if (err) { reject(err); return; }
      const results = [];
      zf.readEntry();
      zf.on('entry', entry => {
        const base = entry.fileName.split('/').pop();
        if (!base) { zf.readEntry(); return; }
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
// Returns array of { name, size } for each file written
ipcMain.handle('fs:extractRarFlat', async (event, rarPath, destDir, filterExts) => {
  try {
    const { createExtractorFromFile } = require('node-unrar-js');
    const exts = filterExts ? new Set(filterExts.map(e => e.toLowerCase())) : null;
    fs.mkdirSync(destDir, { recursive: true });
    const extractor = await createExtractorFromFile({
      filepath: rarPath,
      targetPath: destDir,
      filenameTransform: (filename) => filename.replace(/\\/g, '/').split('/').pop(),
    });
    const extracted = extractor.extract({
      files: (header) => {
        if (header.flags.directory) return false;
        const base = header.name.replace(/\\/g, '/').split('/').pop();
        if (!base) return false;
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
ipcMain.handle('shell:openPath', (event, p) => shell.openPath(p));
ipcMain.handle('shell:showItemInFolder', (event, p) => { shell.showItemInFolder(p); });

// Download a URL directly to a local file, following redirects
ipcMain.handle('download:file', async (event, url, destPath) => {
  const https = require('https');
  const http  = require('http');
  return new Promise((resolve, reject) => {
    function doRequest(u, hops) {
      if (hops > 12) { reject(new Error('Too many redirects')); return; }
      const mod = u.startsWith('https') ? https : http;
      const req = mod.get(u, { headers: { 'User-Agent': 'Mozilla/5.0 PinballMagic/2.36' } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          let loc = res.headers.location;
          if (!/^https?:/.test(loc)) loc = new URL(loc, new URL(u)).href;
          doRequest(loc, hops + 1);
          return;
        }
        if (res.statusCode !== 200) { res.resume(); reject(new Error('HTTP ' + res.statusCode)); return; }
        const total = parseInt(res.headers['content-length'] || '0');
        let received = 0;
        try { fs.mkdirSync(fsPath.dirname(destPath), { recursive: true }); } catch(_) {}
        const out = fs.createWriteStream(destPath);
        res.on('data', chunk => {
          received += chunk.length;
          if (total > 0) event.sender.send('download:progress', { received, total });
        });
        res.pipe(out);
        out.on('finish', () => resolve({ size: received }));
        out.on('error', reject);
        res.on('error', reject);
      });
      req.on('error', reject);
    }
    doRequest(url, 0);
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});
