const { contextBridge, ipcRenderer } = require('electron');

/**
 * preload.js
 * Renderer から直接 ipcRenderer を触らせないための安全なブリッジ
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /* ===============================
   * 保存関連
   * =============================== */

  // main → renderer（保存データ要求）
  onRequestWorkflowData: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('request-workflow-data', handler);

    // ★解除用（多重登録防止）
    return () => {
      ipcRenderer.removeListener('request-workflow-data', handler);
    };
  },

  // renderer → main（保存データ返却）
  sendWorkflowData: (data) => {
    ipcRenderer.send('request-workflow-data-response', data);
  },

  /* ===============================
   * 読み込み関連
   * =============================== */

  // main → renderer（ワークフロー読み込み）
  onWorkflowLoaded: (callback) => {
    const handler = (_e, data) => callback(data);
    ipcRenderer.on('workflow-loaded', handler);

    // ★解除用
    return () => {
      ipcRenderer.removeListener('workflow-loaded', handler);
    };
  },

  /* ===============================
   * 画像・動画ファイル操作
   * =============================== */

  // 画像保存
  saveImageFile: (payload) => {
    return ipcRenderer.invoke('save-image-file', payload);
  },

  // 動画保存
  saveVideoFile: (payload) => {
    return ipcRenderer.invoke('save-video-file', payload);
  },

  // 画像 Blob 読み込み
  loadImageAsBlob: (imagePath) => {
    return ipcRenderer.invoke('load-image-as-blob', imagePath);
  },

  // 動画 Blob 読み込み
  loadVideoAsBlob: (videoPath) => {
    return ipcRenderer.invoke('load-video-as-blob', videoPath);
  },

  /* ===============================
   * config.json 操作
   * =============================== */

  // config.json 読み込み
  loadConfig: () => {
    return ipcRenderer.invoke('load-config');
  },

  // config.json 保存（UI編集用）
  saveConfig: (config) => {
    return ipcRenderer.invoke('save-config', config);
  },
  
  loadTextStyle: () => {
    return ipcRenderer.invoke('load-text-styles');
  },
  saveTextStyle: (textstyle) => {
    return ipcRenderer.invoke('save-text-styles', textstyle);
  },
  onTextStyleLoaded: (callback) => {
    const handler = (_e, data) => callback(data);
    ipcRenderer.on('textstyle-loaded', handler);
    return () => ipcRenderer.removeListener('textstyle-loaded', handler);
  },
  notifyStyleSaved: () => {
    ipcRenderer.send('text-style-saved');
  },
  loadImageStyle: () => ipcRenderer.invoke('load-image-styles'),
  saveImageStyle: (styles) => ipcRenderer.invoke('save-image-styles', styles),
});
