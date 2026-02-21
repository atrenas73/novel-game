// main.js 全文（修正版）

const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ★ 文字化け対策（Windows用） - 一番上に置く
process.env.LANG = 'ja_JP.UTF-8';
process.env.LC_ALL = 'ja_JP.UTF-8';
if (process.platform === 'win32') {
  try {
    require('child_process').execSync('chcp 65001 >nul', { stdio: 'ignore' });
    console.log('[MAIN] コードページをUTF-8に設定しました');
  } catch (err) {
    console.warn('[MAIN] chcp設定失敗', err.message);
  }
}

let mainWindow;

/* =========================
   保存先ディレクトリ
========================= */
const APP_NAME = 'GameEditor';
const USER_DATA_DIR = path.join(app.getPath('userData'), APP_NAME);
const WORKFLOW_DIR = path.join(USER_DATA_DIR, 'workflows');
const IMAGE_DIR = path.join(USER_DATA_DIR, 'images');
const VIDEO_DIR = path.join(USER_DATA_DIR, 'videos');

/* =========================
   ★ Config（エディタルート）
========================= */
const CONFIG_PATH = path.join(__dirname, 'config.json');
const DEFAULT_CONFIG = {
  canvas: {
    width: 1280,
    height: 720,
  },
  layers: {
    bg_base: { id: 'bg_base', type: 'image', label: '背景（ベース）', z: 0, enabled: true },
    bg_effect: { id: 'bg_effect', type: 'image', label: '背景（演出）', z: 5, enabled: true },
    image_back: { id: 'image_back', type: 'image', label: '画像（後）', z: 10, enabled: true },
    image_main: { id: 'image_main', type: 'image', label: '画像（中）', z: 20, enabled: true },
    image_front: { id: 'image_front', type: 'image', label: '画像（前）', z: 30, enabled: true },
    ui_base: { id: 'ui_base', type: 'ui', label: 'UI（枠・背景）', z: 40, enabled: true },
    text_main: { id: 'text_main', type: 'text', label: 'テキスト', z: 50, enabled: true },
  },
};

function ensureConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
  }
}

function loadConfig() {
  ensureConfig();
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

/* =========================
   ★ TextStyle
========================= */
const TEXT_STYLE_PATH = path.join(__dirname, 'TextStyle.json');
const DEFAULT_TEXT_STYLE = {
  "Comment_Default": {
    "label": "コメント_既定",
    "maxLines": 4,
    "font": {
      "family": "'Noto Sans JP','Yu Gothic',sans-serif",
      "size": 28,
      "color": "#ffffff",
      "lineHeight": 1.4,
      "bold": false,
      "italic": false,
      "strike": false
    },
    "layout": {
      "x": null,
      "y": null,
      "width": null,
      "height": null,
      "widthRatio": 0.95,
      "heightRatio": 0.25,
      "padding": 5,
      "alignHorizontal": "center",
      "alignVertical": "middle",
      "positionPreset": "bottom_center",
      "margin": 10
    },
    "box": {
      "enabled": true,
      "background": "rgba(0,0,30,0.65)",
      "borderColor": "#6666aa",
      "borderWidth": 1,
      "borderRadius": 4
    },
    "typing": {
      "enabled": true,
      "speed": 50,
      "allowSkip": true
    }
  },
  "Subtitle_Default": {
    "label": "字幕_既定",
    "maxLines": 1,
    "font": {
      "family": "'Noto Sans JP','Yu Gothic',sans-serif",
      "size": 26,
      "color": "#ffffff",
      "lineHeight": 1.2,
      "bold": false,
      "italic": false,
      "strike": false
    },
    "layout": {
      "x": null,
      "y": null,
      "width": null,
      "height": 60,
      "widthRatio": 1.0,
      "heightRatio": null,
      "padding": 0,
      "alignHorizontal": "center",
      "alignVertical": "middle",
      "positionPreset": "bottom_center",
      "margin": 12
    },
    "box": {
      "enabled": false
    },
    "typing": {
      "enabled": false,
      "speed": 0,
      "allowSkip": false
    }
  }
};

function ensureTextStyle() {
  if (!fs.existsSync(TEXT_STYLE_PATH)) {
    fs.writeFileSync(TEXT_STYLE_PATH, JSON.stringify(DEFAULT_TEXT_STYLE, null, 2), 'utf-8');
  }
}

function loadTextStyles() {
  if (!fs.existsSync(TEXT_STYLE_PATH)) return {};
  return JSON.parse(fs.readFileSync(TEXT_STYLE_PATH, 'utf-8'));
}

/* =========================
   ★ ImageStyle（新規追加）
========================= */
const IMAGE_STYLE_PATH = path.join(__dirname, 'ImageStyle.json');
const DEFAULT_IMAGE_STYLE = {
  "Background_Base": {
    "label": "背景（ベース）",
    "type": "background",
    "opacity": 1.0,
    "blendMode": "normal",
    "scaleMode": "cover",
    "position": { "x": 0, "y": 0 },
    "size": { "width": "100%", "height": "100%" },
    "filters": { "brightness": 1.0, "contrast": 1.0, "saturation": 1.0, "blur": 0 }
  },
  "Character_Front": {
    "label": "キャラ（前）",
    "type": "character",
    "opacity": 1.0,
    "blendMode": "normal",
    "scaleMode": "contain",
    "position": { "x": "center", "y": "bottom" },
    "size": { "width": "auto", "height": "80%" },
    "filters": { "brightness": 1.0, "contrast": 1.0, "saturation": 1.0, "blur": 0 }
  },
  "Effect_Overlay": {
    "label": "演出オーバーレイ",
    "type": "effect",
    "opacity": 0.7,
    "blendMode": "screen",
    "scaleMode": "cover",
    "position": { "x": 0, "y": 0 },
    "size": { "width": "100%", "height": "100%" },
    "filters": { "brightness": 1.2, "contrast": 1.1, "saturation": 1.3, "blur": 2 }
  }
};

function ensureImageStyle() {
  if (!fs.existsSync(IMAGE_STYLE_PATH)) {
    fs.writeFileSync(IMAGE_STYLE_PATH, JSON.stringify(DEFAULT_IMAGE_STYLE, null, 2), 'utf-8');
  }
}

function loadImageStyles() {
  ensureImageStyle();
  return JSON.parse(fs.readFileSync(IMAGE_STYLE_PATH, 'utf-8'));
}

/* =========================
   ディレクトリ保証
========================= */
function ensureDirectories() {
  [WORKFLOW_DIR, IMAGE_DIR, VIDEO_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

/* =========================
   Window 作成
========================= */
function createWindow() {
  ensureDirectories();
  ensureConfig();
  ensureTextStyle();
  ensureImageStyle();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL('http://localhost:5173');
  mainWindow.webContents.openDevTools();

  mainWindow.webContents.once('did-finish-load', () => {
    const config = loadConfig();
    const textStyle = loadTextStyles();
    const imageStyle = loadImageStyles();
    mainWindow.webContents.send('config-loaded', config);
    mainWindow.webContents.send('textstyle-loaded', textStyle);
    mainWindow.webContents.send('image-style-loaded', imageStyle);
  });

  createMenu();
}

/* =========================
   メニュー
========================= */
function createMenu() {
  const template = [
    {
      label: 'ファイル',
      submenu: [
        {
          label: 'ワークフローを保存',
          click: async () => {
            mainWindow.webContents.send('request-workflow-data');
            const data = await new Promise(resolve => {
              ipcMain.once('request-workflow-data-response', (_e, result) => resolve(result));
            });
            if (!data) return;
            const { canceled, filePath } = await dialog.showSaveDialog({
              defaultPath: path.join(WORKFLOW_DIR, 'new.workflow.json'),
              filters: [{ name: 'Workflow', extensions: ['json'] }],
            });
            if (canceled || !filePath) return;
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
          },
        },
        {
          label: 'ワークフローを読み込み',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog({
              defaultPath: WORKFLOW_DIR,
              filters: [{ name: 'Workflow', extensions: ['json'] }],
              properties: ['openFile'],
            });
            if (canceled || filePaths.length === 0) return;
            const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
            mainWindow.webContents.send('workflow-loaded', data);
          },
        },
        { type: 'separator' },
        { label: '終了', click: () => app.quit() },
      ],
    },
    {
      label: '設定',
      submenu: [
        {
          label: 'config.json を開く',
          click: () => {
            ensureConfig();
            require('electron').shell.openPath(CONFIG_PATH);
          },
        },
        {
          label: 'TextStyle.json を開く',
          click: () => {
            ensureTextStyle();
            require('electron').shell.openPath(TEXT_STYLE_PATH);
          },
        },
        {
          label: 'ImageStyle.json を開く',
          click: () => {
            ensureImageStyle();
            require('electron').shell.openPath(IMAGE_STYLE_PATH);
          },
        },
        { type: 'separator' },
        {
          label: 'config 再読み込み',
          click: () => {
            const config = loadConfig();
            mainWindow.webContents.send('config-loaded', config);
          },
        },
        {
          label: 'TextStyle 再読み込み',
          click: () => {
            const style = loadTextStyles();
            BrowserWindow.getAllWindows().forEach(win => {
              win.webContents.send('textstyle-loaded', style);
            });
            console.log('[MAIN] textstyle-loaded send all window');
          },
        },
        {
          label: 'ImageStyle 再読み込み',
          click: () => {
            const style = loadImageStyles();
            BrowserWindow.getAllWindows().forEach(win => {
              win.webContents.send('image-style-loaded', style);
            });
            console.log('[MAIN] image-style-loaded send all window');
          },
        },
        { type: 'separator' },
        {
          label: 'TextStyle 設定',
          click: () => {
            const win = new BrowserWindow({
              width: 900,
              height: 700,
              webPreferences: { preload: path.join(__dirname, 'preload.js') },
            });
            win.loadURL('http://localhost:5173/#/text-style-editor');
            win.webContents.openDevTools({ mode: 'detach' });
          },
        },
        {
          label: 'ImageStyle 設定',
          click: () => {
            const win = new BrowserWindow({
              width: 900,
              height: 700,
              webPreferences: { preload: path.join(__dirname, 'preload.js') },
            });
            win.loadURL('http://localhost:5173/#/image-style-editor');
            win.webContents.openDevTools({ mode: 'detach' });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* =========================
   IPC
========================= */
ipcMain.handle('load-config', async () => loadConfig());

ipcMain.handle('load-text-styles', async () => {
  if (!fs.existsSync(TEXT_STYLE_PATH)) {
    fs.writeFileSync(TEXT_STYLE_PATH, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(TEXT_STYLE_PATH, 'utf-8'));
});

ipcMain.handle('load-image-styles', async () => {
  if (!fs.existsSync(IMAGE_STYLE_PATH)) {
    fs.writeFileSync(IMAGE_STYLE_PATH, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(IMAGE_STYLE_PATH, 'utf-8'));
});

ipcMain.handle('save-image-file', async (_event, { buffer, fileName }) => {
  ensureDirectories();
  const savePath = path.join(IMAGE_DIR, `${Date.now()}_${fileName}`);
  fs.writeFileSync(savePath, Buffer.from(buffer));
  return savePath;
});

ipcMain.handle('save-video-file', async (_event, { buffer, fileName }) => {
  ensureDirectories();
  const savePath = path.join(VIDEO_DIR, `${Date.now()}_${fileName}`);
  fs.writeFileSync(savePath, Buffer.from(buffer));
  return savePath;
});

ipcMain.handle('load-image-as-blob', async (_e, imagePath) => fs.readFileSync(imagePath));

ipcMain.handle('load-video-as-blob', async (_e, filePath) => fs.readFileSync(filePath));

ipcMain.handle('save-text-styles', async (_e, styles) => {
  fs.writeFileSync(TEXT_STYLE_PATH, JSON.stringify(styles, null, 2), 'utf-8');
});

ipcMain.handle('save-image-styles', async (_e, styles) => {
  fs.writeFileSync(IMAGE_STYLE_PATH, JSON.stringify(styles, null, 2), 'utf-8');
});

ipcMain.handle('save-and-broadcast-styles', async (_event, styles) => {
  try {
    fs.writeFileSync(TEXT_STYLE_PATH, JSON.stringify(styles, null, 2), 'utf-8');
    console.log('[MAIN] handleCloseからの保存完了');
    const freshStyle = loadTextStyles();
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('textstyle-loaded', freshStyle);
    });
    console.log('[MAIN] handleCloseから全ウィンドウに textstyle-loaded 送信');
    return { success: true };
  } catch (err) {
    console.error('[MAIN] handleClose保存失敗', err);
    throw err;
  }
});

ipcMain.on('text-style-saved', () => {
  const style = loadTextStyles();
  console.log('[MAIN] 保存通知受信 → textstyle-loaded を全ウィンドウに再送信');
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('textstyle-loaded', style);
  });
});

/* =========================
   App lifecycle
========================= */
app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});