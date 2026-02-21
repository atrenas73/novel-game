import { useState, useEffect, useRef } from 'react';

/* =========================
 * 定数・デフォルト値
 * ========================= */
const DEFAULT_CANVAS = { width: 1280, height: 720 };
const DEFAULT_SCALE = 1.00;
const SAMPLE_IMAGE = '/assets/preview-placeholder.jpg';

/* =========================
 * レイアウト計算（修正版）
 * ========================= */
function resolveLayout(layout = {}, canvas, imageDimensions) {
  const {
    x = null,
    y = null,
    width = null,
    height = null,
    widthRatio = 1.0,
    heightRatio = 1.0,
    positionPreset = 'center',
  } = layout;

  const baseW = imageDimensions?.width || layout.width || 1920;
  const baseH = imageDimensions?.height || layout.height || 1080;

  let finalWidth = width ?? Math.round(baseW * widthRatio);
  let finalHeight = height ?? Math.round(baseH * heightRatio);

  finalWidth = Math.max(1, finalWidth);
  finalHeight = Math.max(1, finalHeight);

  let finalX = x;
  let finalY = y;

  if (x === null || y === null) {
    let rx = 0;
    let ry = 0;

    switch (positionPreset) {
      case 'top_left':
        rx = 0;
        ry = 0;
        break;
      case 'top_center':
        rx = (canvas.width - finalWidth) / 2;
        ry = 0;
        break;
      case 'top_right':
        rx = canvas.width - finalWidth;
        ry = 0;
        break;
      case 'left':
        rx = 0;
        ry = (canvas.height - finalHeight) / 2;
        break;
      case 'center':
        rx = (canvas.width - finalWidth) / 2;
        ry = (canvas.height - finalHeight) / 2;
        break;
      case 'right':
        rx = canvas.width - finalWidth;
        ry = (canvas.height - finalHeight) / 2;
        break;
      case 'bottom_left':
        rx = 0;
        ry = canvas.height - finalHeight;
        break;
      case 'bottom_center':
        rx = (canvas.width - finalWidth) / 2;
        ry = canvas.height - finalHeight;
        break;
      case 'bottom_right':
        rx = canvas.width - finalWidth;
        ry = canvas.height - finalHeight;
        break;
      default:
        rx = (canvas.width - finalWidth) / 2;
        ry = (canvas.height - finalHeight) / 2;
    }

    finalX = x ?? rx;
    finalY = y ?? ry;
  }

  finalX = Math.max(0, Math.min(finalX, canvas.width - finalWidth));
  finalY = Math.max(0, Math.min(finalY, canvas.height - finalHeight));

  return {
    x: Math.round(finalX),
    y: Math.round(finalY),
    width: Math.round(finalWidth),
    height: Math.round(finalHeight),
  };
}

function resolveScale({ scaleMode, imageWidth, imageHeight, boxWidth, boxHeight }) {
  if (scaleMode === 'none') {
    return { scaleX: 1, scaleY: 1 };
  }

  const sx = boxWidth / imageWidth;
  const sy = boxHeight / imageHeight;

  if (scaleMode === 'contain') {
    const s = Math.min(sx, sy);
    return { scaleX: s, scaleY: s };
  }

  if (scaleMode === 'cover') {
    const s = Math.max(sx, sy);
    return { scaleX: s, scaleY: s };
  }

  if (scaleMode === 'fill') {
    return { scaleX: sx, scaleY: sy };
  }

  return { scaleX: 1, scaleY: 1 };
}

/* =========================
 * 新規スタイル作成モーダルコンポーネント
 * ========================= */
function NewStyleModal({ isOpen, onClose, onSubmit, existingStyles = {} }) {
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [baseStyle, setBaseStyle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setKey('');
      setLabel('');
      setBaseStyle('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!key.trim()) {
      setError('スタイルキーを入力してください');
      return;
    }

    if (!label.trim()) {
      setError('表示名を入力してください');
      return;
    }

    if (key.includes(' ') || key.match(/[^a-zA-Z0-9_]/)) {
      setError('スタイルキーは半角英数字とアンダースコア(_)のみ使用できます');
      return;
    }

    if (existingStyles[key]) {
      setError('このスタイルキーはすでに存在します');
      return;
    }

    onSubmit(key.trim(), label.trim(), baseStyle);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'linear-gradient(to bottom, #2a2a2a, #1e1e1e)',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 500,
        border: '1px solid #444',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 20, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#4af' }}>➕</span>
          新規イメージスタイルの作成
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#ccc', marginBottom: 8, fontWeight: '500' }}>
                スタイルキー
                <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: 6 }}>
                  （半角英数字と_のみ、例: Background_Default）
                </span>
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="例: Background_Default"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#1a1a1a',
                  color: '#fff',
                  border: error ? '1px solid #f44' : '1px solid #3a3a3a',
                  borderRadius: 8,
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                autoFocus
              />
              {key && (
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 4 }}>
                  使用予定: <code style={{ background: '#1a1a1a', padding: '2px 6px', borderRadius: 4 }}>{key}</code>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#ccc', marginBottom: 8, fontWeight: '500' }}>
                表示名
                <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: 6 }}>
                  （UIで表示される名前）
                </span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="例: デフォルト背景"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#1a1a1a',
                  color: '#fff',
                  border: error ? '1px solid #f44' : '1px solid #3a3a3a',
                  borderRadius: 8,
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#ccc', marginBottom: 8, fontWeight: '500' }}>
                ベースにする既存スタイル
                <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: 6 }}>
                  （オプション：設定をコピーします）
                </span>
              </label>
              <select
                value={baseStyle}
                onChange={(e) => setBaseStyle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#1a1a1a',
                  color: '#fff',
                  border: '1px solid #3a3a3a',
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">新規作成（デフォルト設定）</option>
                {Object.entries(existingStyles).map(([styleKey, style]) => (
                  <option key={styleKey} value={styleKey}>
                    {styleKey}（{style.label}）
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(244, 67, 54, 0.1)',
                border: '1px solid #f44',
                borderRadius: 6,
                color: '#f88',
                fontSize: '0.85rem',
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 8,
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid #555',
                  borderRadius: 6,
                  color: '#aaa',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => e.target.style.background = '#333'}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={!key.trim() || !label.trim()}
                style={{
                  padding: '10px 24px',
                  background: !key.trim() || !label.trim() ? '#333' : 'linear-gradient(to right, #3a6, #4a8)',
                  border: 'none',
                  borderRadius: 6,
                  color: !key.trim() || !label.trim() ? '#666' : '#fff',
                  cursor: !key.trim() || !label.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                }}
              >
                作成する
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================
 * メインコンポーネント
 * ========================= */
export default function ImageStyleEditor({ canvas = DEFAULT_CANVAS }) {
  const [styles, setStyles] = useState({});
  const [activeKey, setActiveKey] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    window.electronAPI.loadImageStyle().then((json) => {
      if (!json || typeof json !== 'object') return;
      setStyles(json);
      const keys = Object.keys(json);
      if (keys.length > 0) {
        setActiveKey(keys[0]);
      }
    });
  }, []);
  
  const [previewFileName, setPreviewFileName] = useState('');
  const [imageDimensions, setImageDimensions] = useState({ width: null, height: null });
  const fileInputRef = useRef(null);
  const [previewImage, setPreviewImage] = useState(SAMPLE_IMAGE);
  const [imageObjectUrl, setImageObjectUrl] = useState(null);
  const [userScale, setUserScale] = useState(DEFAULT_SCALE);

  const currentStyle = styles[activeKey];

  const handleChange = (patch) => {
    setStyles(prev => ({
      ...prev,
      [activeKey]: {
        ...prev[activeKey],
        ...patch,
        layout: patch.layout ? { ...prev[activeKey]?.layout, ...patch.layout } : prev[activeKey]?.layout,
        box: patch.box ? { ...prev[activeKey]?.box, ...patch.box } : prev[activeKey]?.box,
        filters: patch.filters ? { ...prev[activeKey]?.filters, ...patch.filters } : prev[activeKey]?.filters,
      },
    }));
  };
  
  useEffect(() => {
    return () => {
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl);
      }
    };
  }, [imageObjectUrl]);
  
  // 初期プレビュー画像の情報を取得
  useEffect(() => {
    if (!previewImage) return;

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      setPreviewFileName('preview-placeholder.jpg');
      setImageDimensions({ width: w, height: h });

      // 画像が読み込まれたときに、layoutの幅と高さを画像サイズで初期化
      if (activeKey && styles[activeKey]) {
        handleChange({
          layout: {
            width: null,
            height: null,
            widthRatio: 1.0,
            heightRatio: 1.0,
          },
        });
      }
    };
    img.src = previewImage;
  }, [previewImage, activeKey]);

  // 新規スタイル作成処理
  const handleCreateNewStyle = (key, label, baseStyleKey) => {
    if (styles[key]) {
      alert('このスタイルキーはすでに存在します');
      return;
    }

    let base = null;
    if (baseStyleKey && styles[baseStyleKey]) {
      // 既存のスタイルをベースにする
      base = { ...styles[baseStyleKey], label };
    } else {
      // デフォルト設定で新規作成
      base = {
        label: label,
        type: "background",
        opacity: 1.0,
        blendMode: "normal",
        scaleMode: "cover",
        layout: { 
          x: null, 
          y: null, 
          width: null, 
          height: null, 
          widthRatio: 1.0, 
          heightRatio: 1.0, 
          positionPreset: "center" 
        },
        box: { 
          enabled: false, 
          background: "rgba(0,0,0,0.4)", 
          borderColor: "#444488", 
          borderWidth: 0, 
          borderRadius: 0 
        },
        filters: { 
          brightness: 1.0, 
          contrast: 1.0, 
          saturation: 1.0, 
          blur: 0 
        },
        // アニメーション部分は削除
      };
    }

    setStyles(prev => ({ ...prev, [key]: base }));
    setActiveKey(key);

    console.log('[ImageStyleEditor] 新規スタイル作成:', { key, label, baseStyleKey });
  };

  // スタイル削除
  const handleDeleteStyle = () => {
    if (!activeKey) {
      alert('削除するスタイルを選択してください');
      return;
    }

    if (!window.confirm(`"${styles[activeKey].label}" (${activeKey}) を削除しますか？\n\n※この操作は元に戻せません。`)) return;

    setStyles(prev => {
      const next = { ...prev };
      delete next[activeKey];
      return next;
    });

    const remainingKeys = Object.keys(styles).filter(k => k !== activeKey);
    setActiveKey(remainingKeys[0] || null);

    console.log('[ImageStyleEditor] スタイル削除:', activeKey);
  };

  const handleSave = async () => {
    const confirmed = window.confirm('ImageStyle.json を上書き保存しますか？\nメイン画面に反映されます。');
    if (!confirmed) return;
    try {
      await window.electronAPI.saveImageStyle(styles);
      console.log('[ImageStyleEditor] 保存完了');

      const freshData = await window.electronAPI.loadImageStyle();
      if (!freshData || typeof freshData !== 'object' || Array.isArray(freshData)) {
        throw new Error('読み込んだデータが不正です');
      }

      setStyles(freshData);

      const keys = Object.keys(freshData);
      if (keys.length > 0 && !freshData[activeKey]) {
        setActiveKey(keys[0]);
      }

      if (window.electronAPI.notifyStyleSaved) {
        await window.electronAPI.notifyStyleSaved();
        console.log('[ImageStyleEditor] メインに保存通知送信完了');
      } else {
        console.warn('[ImageStyleEditor] notifyStyleSaved が定義されていません');
      }

      alert('保存しました！ メイン画面に反映されます');
    } catch (err) {
      console.error('[ImageStyleEditor] 保存失敗', err);
      alert('保存に失敗しました');
    }
  };

  // 現在のスタイルのレイアウトを計算
  const currentResolved = currentStyle 
    ? resolveLayout(currentStyle.layout, canvas, imageDimensions)
    : { x: 0, y: 0, width: 0, height: 0 };

  return (
    <>
      <NewStyleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateNewStyle}
        existingStyles={styles}
      />
      
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          gap: 16,
          boxSizing: 'border-box',
          color: '#eee',
          background: '#1a1a1a',
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ margin: 0 }}>イメージスタイル エディター</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(to right, #3a6, #4a8)',
                border: 'none',
                borderRadius: 6,
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>➕</span>
              新規スタイルを作成
            </button>
            <button
              onClick={handleDeleteStyle}
              disabled={!activeKey}
              style={{
                padding: '8px 16px',
                background: activeKey ? 'linear-gradient(to right, #c44, #d55)' : '#444',
                border: 'none',
                borderRadius: 6,
                color: 'white',
                cursor: activeKey ? 'pointer' : 'not-allowed',
                opacity: activeKey ? 1 : 0.5,
              }}
            >
              選択中を削除
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(to right, #3a6, #4a8)',
                border: 'none',
                borderRadius: 6,
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              💾 保存（ImageStyle.json）
            </button>
          </div>
        </div>

        {/* スタイル選択 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 12, borderBottom: '1px solid #444' }}>
          {Object.entries(styles).map(([key, s]) => (
            <button
              key={key}
              onClick={() => setActiveKey(key)}
              style={{
                padding: '8px 16px',
                background: activeKey === key ? 'linear-gradient(to right, #3a5a7a, #4a6a8a)' : '#2a2a2a',
                border: `1px solid ${activeKey === key ? '#5a7aaa' : '#555'}`,
                borderRadius: 6,
                color: activeKey === key ? '#fff' : '#ccc',
                fontWeight: activeKey === key ? '600' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onMouseOver={(e) => {
                if (activeKey !== key) {
                  e.target.style.background = '#3a3a3a';
                  e.target.style.borderColor = '#666';
                }
              }}
              onMouseOut={(e) => {
                if (activeKey !== key) {
                  e.target.style.background = '#2a2a2a';
                  e.target.style.borderColor = '#555';
                }
              }}
            >
              <span style={{ opacity: activeKey === key ? 1 : 0.7 }}>
                {activeKey === key ? '●' : '○'}
              </span>
              {s.label}
              <span style={{ 
                fontSize: '0.75rem', 
                opacity: 0.7,
                marginLeft: 4 
              }}>
                ({key})
              </span>
            </button>
          ))}
        </div>

        {/* プレビュー + 編集エリア */}
        <div style={{ flex: 1, display: 'flex', gap: 24, minHeight: 0 }}>
          {/* プレビューエリア */}
          <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 style={{ margin: 0 }}>プレビュー</h4>

            {/* 操作バー */}
            <div
              style={{
                background: '#222',
                padding: 12,
                borderRadius: 6,
                border: '1px solid #444',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* 上段：キャンバス情報 */}
              <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                キャンバス {canvas.width} × {canvas.height}
              </div>

              {/* 下段：操作 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <label style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>倍率</label>

                <input
                  type="range"
                  min="0.3"
                  max="1.2"
                  step="0.05"
                  value={userScale}
                  onChange={(e) => setUserScale(Number(e.target.value))}
                  style={{ flex: 1 }}
                />

                <span style={{ width: 50, textAlign: 'right', fontWeight: 'bold' }}>
                  {Math.round(userScale * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '8px 16px',
                    background: '#3366cc',
                    border: 'none',
                    borderRadius: 6,
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  画像を選択
                </button>

                {/* 隠し input */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setPreviewFileName(file.name);
                    setImageDimensions({ width: null, height: null });

                    const url = URL.createObjectURL(file);

                    if (imageObjectUrl) {
                      URL.revokeObjectURL(imageObjectUrl);
                    }
                    setImageObjectUrl(url);
                    setPreviewImage(url);

                    const img = new Image();
                    img.onload = () => {
                      const w = img.naturalWidth;
                      const h = img.naturalHeight;

                      setImageDimensions({ width: w, height: h });

                      if (activeKey && styles[activeKey]) {
                        handleChange({
                          layout: {
                            width: null,
                            height: null,
                            widthRatio: 1.0,
                            heightRatio: 1.0,
                          },
                        });
                      }
                    };
                    img.src = url;

                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {/* プレビューキャンバス */}
            <div
              style={{
                flex: 1,
                background: '#000',
                border: '1px solid #333',
                borderRadius: 6,
                overflow: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                padding: 24,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: canvas.width,
                  height: canvas.height,
                  transform: `scale(${userScale})`,
                  transformOrigin: 'top left',
                  background: '#111',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    border: '2px dashed #aaa',
                    pointerEvents: 'none',
                    opacity: 0.5,
                  }}
                />

                <PreviewBox
                  style={currentStyle}
                  resolved={currentResolved}
                  previewImage={previewImage}
                  imageDimensions={imageDimensions}
                />
              </div>
            </div>

            {/* ステータスバー */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.85rem',
                color: '#aaa',
                padding: '8px 12px',
                background: '#1e1e1e',
                borderRadius: 6,
                border: '1px solid #333',
              }}
            >
              <div style={{ display: 'flex', gap: 20 }}>
                {previewFileName && (
                  <span>
                    ファイル: <strong style={{ color: '#8f8' }}>{previewFileName}</strong>
                  </span>
                )}
                {imageDimensions.width ? (
                  <span>
                    元サイズ:{' '}
                    <strong style={{ color: '#0ff' }}>
                      {imageDimensions.width} × {imageDimensions.height}px
                    </strong>
                  </span>
                ) : (
                  previewFileName && <span style={{ color: '#666' }}>サイズ取得中…</span>
                )}
              </div>

              {previewFileName && imageDimensions.width && (
                <span>
                  比率 {(imageDimensions.width / imageDimensions.height).toFixed(3)}
                </span>
              )}
            </div>
          </div>

          {/* 編集フォーム */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
            {currentStyle ? (
              <EditorForm
                currentStyle={currentStyle}
                currentKey={activeKey}
                onChange={handleChange}
                imageDimensions={imageDimensions}
                canvas={canvas}
              />
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#888',
                textAlign: 'center',
                padding: 40,
              }}>
                <div style={{ fontSize: '4rem', marginBottom: 20 }}>🖼️</div>
                <h3 style={{ margin: 0, color: '#aaa' }}>スタイルがありません</h3>
                <p style={{ marginTop: 12, fontSize: '0.9rem' }}>
                  「新規スタイルを作成」ボタンをクリックして<br />
                  最初のスタイルを作成してください
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    marginTop: 24,
                    padding: '12px 24px',
                    background: 'linear-gradient(to right, #3a6, #4a8)',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>➕</span>
                  新規スタイルを作成
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* =========================
 * プレビュー表示コンポーネント（修正版）
 * ========================= */
function PreviewBox({ style, resolved, previewImage, imageDimensions }) {
  const imgRef = useRef(null);
  const [scale, setScale] = useState({ scaleX: 1, scaleY: 1 });

  useEffect(() => {
    if (!style || !imageDimensions.width || !imgRef.current) return;

    const actualWidth = imageDimensions.width;
    const actualHeight = imageDimensions.height;
    
    const newScale = resolveScale({
      scaleMode: style.scaleMode || 'cover',
      imageWidth: actualWidth,
      imageHeight: actualHeight,
      boxWidth: resolved.width,
      boxHeight: resolved.height,
    });

    setScale(newScale);

    const img = imgRef.current;
    img.style.transform = `scale(${newScale.scaleX}, ${newScale.scaleY})`;
    img.style.transformOrigin = 'top left';
  }, [style?.scaleMode, resolved, imageDimensions]);

  if (!style || !previewImage) return null;

  const b = style.box || {};
  const f = style.filters || {};

  return (
    <div
      style={{
        position: 'absolute',
        left: resolved.x,
        top: resolved.y,
        width: resolved.width,
        height: resolved.height,
        overflow: 'hidden',
        boxSizing: 'border-box',
        background: b.enabled ? b.background : 'transparent',
        border: b.enabled ? `${b.borderWidth}px solid ${b.borderColor}` : 'none',
        borderRadius: b.borderRadius ?? 0,
        opacity: style.opacity ?? 1,
        mixBlendMode: style.blendMode ?? 'normal',
        filter: `brightness(${f.brightness ?? 1})
                 contrast(${f.contrast ?? 1})
                 saturate(${f.saturation ?? 1})
                 blur(${f.blur ?? 0}px)`
      }}
    >
      <img
        ref={imgRef}
        src={previewImage}
        alt=""
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;
          const actualWidth = img.naturalWidth;
          const actualHeight = img.naturalHeight;
          
          const newScale = resolveScale({
            scaleMode: style.scaleMode || 'cover',
            imageWidth: actualWidth,
            imageHeight: actualHeight,
            boxWidth: resolved.width,
            boxHeight: resolved.height,
          });

          setScale(newScale);
          img.style.transform = `scale(${newScale.scaleX}, ${newScale.scaleY})`;
          img.style.transformOrigin = 'top left';
        }}
        style={{
          width: imageDimensions.width || 'auto',
          height: imageDimensions.height || 'auto',
          display: 'block',
        }}
      />
    </div>
  );
}

/* =========================
 * 編集フォーム（アニメーション部分削除版）
 * ========================= */
function EditorForm({ currentStyle, currentKey, onChange, imageDimensions, canvas }) {
  if (!currentStyle) return <div>スタイルを選択してください</div>;

  const update = (patch) => onChange(patch);

  const l = currentStyle.layout || {};
  const b = currentStyle.box || {};
  const f = currentStyle.filters || {};

  const useFixed = l.x !== null || l.y !== null;

  const currentResolved = resolveLayout(l, canvas, imageDimensions);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingRight: 4 }}>
      
      {/* ===== セクション 1: 基本情報 ===== */}
      <div style={{ 
        border: '1px solid #333', 
        borderRadius: 8, 
        overflow: 'hidden',
        background: 'linear-gradient(to bottom, #252525, #1e1e1e)'
      }}>
        <div style={{ 
          padding: '16px 20px', 
          background: '#2a2a2a',
          borderBottom: '1px solid #333'
        }}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#4af' }}>⚙️</span>
            基本情報
          </h4>
        </div>
        
        <div style={{ padding: '20px', display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc' }}>
              スタイルキー
              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 2 }}>
                識別子（変更不可）
              </div>
            </label>
            <input
              type="text"
              value={currentKey || ''}
              readOnly
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#1a1a1a',
                color: '#aaa',
                border: '1px solid #3a3a3a',
                borderRadius: 6,
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc' }}>
              表示名
            </label>
            <input
              value={currentStyle.label ?? ''}
              onChange={e => update({ label: e.target.value })}
              style={{ 
                width: '100%',
                padding: '10px 12px',
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #3a3a3a',
                borderRadius: 6,
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc' }}>
              タイプ
            </label>
            <select 
              value={currentStyle.type ?? 'background'} 
              onChange={e => update({ type: e.target.value })} 
              style={{ 
                width: '100%',
                padding: '10px 12px',
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #3a3a3a',
                borderRadius: 6,
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            >
              <option value="background">背景</option>
              <option value="character">キャラクター</option>
              <option value="effect">演出エフェクト</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===== セクション 2: 表示設定 ===== */}
      <div style={{ 
        border: '1px solid #333', 
        borderRadius: 8, 
        overflow: 'hidden',
        background: 'linear-gradient(to bottom, #252525, #1e1e1e)'
      }}>
        <div style={{ 
          padding: '16px 20px', 
          background: '#2a2a2a',
          borderBottom: '1px solid #333'
        }}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#4af' }}>🎨</span>
            表示設定
          </h4>
        </div>
        
        <div style={{ padding: '20px', display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc' }}>
              不透明度
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={currentStyle.opacity ?? 1.0} 
                onChange={e => update({ opacity: Number(e.target.value) })} 
                style={{ flex: 1, minWidth: 0 }}
              />
              <span style={{ 
                minWidth: 40, 
                textAlign: 'center', 
                background: '#1a1a1a', 
                padding: '6px 8px',
                borderRadius: 4,
                border: '1px solid #3a3a3a',
                fontSize: '0.85rem',
                flexShrink: 0
              }}>
                {Math.round((currentStyle.opacity ?? 1.0) * 100)}%
              </span>
            </div>
          </div>
          
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc' }}>
              ブレンドモード
            </label>
            <select 
              value={currentStyle.blendMode ?? 'normal'} 
              onChange={e => update({ blendMode: e.target.value })} 
              style={{ 
                width: '100%',
                padding: '10px 12px',
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #3a3a3a',
                borderRadius: 6,
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            >
              <option value="normal">通常 (normal)</option>
              <option value="multiply">乗算 (multiply)</option>
              <option value="screen">スクリーン (screen)</option>
              <option value="overlay">オーバーレイ (overlay)</option>
              <option value="darken">比較（暗）(darken)</option>
              <option value="lighten">比較（明）(lighten)</option>
            </select>
          </div>
          
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc' }}>
              スケールモード
            </label>
            <select 
              value={currentStyle.scaleMode ?? 'cover'} 
              onChange={e => update({ scaleMode: e.target.value })} 
              style={{ 
                width: '100%',
                padding: '10px 12px',
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #3a3a3a',
                borderRadius: 6,
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            >
              <option value="cover">全面表示 (cover)</option>
              <option value="contain">全体表示 (contain)</option>
              <option value="fill">引き伸ばし (fill)</option>
              <option value="none">等倍表示 (none)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===== セクション 3: レイアウト & 配置 ===== */}
      <div style={{ 
        border: '1px solid #333', 
        borderRadius: 8, 
        overflow: 'hidden',
        background: 'linear-gradient(to bottom, #252525, #1e1e1e)'
      }}>
        <div style={{ 
          padding: '16px 20px', 
          background: '#2a2a2a',
          borderBottom: '1px solid #333'
        }}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#4af' }}>📐</span>
            レイアウト & 配置
          </h4>
        </div>
        
        <div style={{ padding: '20px' }}>
          {/* 現在の設定概要 */}
          <div style={{ 
            background: 'linear-gradient(to right, #1a2a3a, #2a3a4a)',
            padding: '16px',
            borderRadius: 8,
            marginBottom: 20,
            border: '1px solid #3a4a5a'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 12,
              marginBottom: 12 
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#a0c0ff', marginBottom: 4 }}>表示サイズ</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0ff' }}>
                  {currentResolved.width} × {currentResolved.height}px
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#a0c0ff', marginBottom: 4 }}>位置</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#8f8' }}>
                  ({currentResolved.x}, {currentResolved.y})
                </div>
              </div>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 12 
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#a0c0ff', marginBottom: 4 }}>画像サイズ</div>
                <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                  {imageDimensions.width ? 
                    `${imageDimensions.width} × ${imageDimensions.height}px` : 
                    '読み込み中...'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#a0c0ff', marginBottom: 4 }}>キャンバス</div>
                <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                  {canvas.width} × {canvas.height}px
                </div>
              </div>
            </div>
          </div>

          {/* 配置モード切り替え */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ 
              fontSize: '0.85rem', 
              fontWeight: '500', 
              color: '#ccc', 
              marginBottom: 8 
            }}>
              配置モード
            </div>
            <div style={{ 
              display: 'flex', 
              background: '#1a1a1a', 
              borderRadius: 8, 
              padding: 4,
              border: '1px solid #3a3a3a'
            }}>
              <button
                onClick={() => update({ 
                  layout: { 
                    x: null, 
                    y: null, 
                    widthRatio: l.widthRatio ?? 1, 
                    heightRatio: l.heightRatio ?? 1,
                    positionPreset: l.positionPreset ?? 'center'
                  } 
                })}
                style={{
                  flex: 1, 
                  padding: '10px 12px', 
                  border: 'none', 
                  borderRadius: 6, 
                  cursor: 'pointer',
                  background: !useFixed ? 'linear-gradient(to right, #3a5a7a, #4a6a8a)' : 'transparent', 
                  color: !useFixed ? '#fff' : '#888',
                  fontWeight: !useFixed ? '600' : '400',
                  transition: 'all 0.2s',
                  fontSize: '0.9rem',
                  minWidth: 0
                }}
              >
                📍 プリセット配置
              </button>
              <button
                onClick={() => {
                  update({ 
                    layout: { 
                      x: currentResolved.x, 
                      y: currentResolved.y, 
                      width: currentResolved.width, 
                      height: currentResolved.height 
                    } 
                  });
                }}
                style={{
                  flex: 1, 
                  padding: '10px 12px', 
                  border: 'none', 
                  borderRadius: 6, 
                  cursor: 'pointer',
                  background: useFixed ? 'linear-gradient(to right, #3a5a7a, #4a6a8a)' : 'transparent', 
                  color: useFixed ? '#fff' : '#888',
                  fontWeight: useFixed ? '600' : '400',
                  transition: 'all 0.2s',
                  fontSize: '0.9rem',
                  minWidth: 0
                }}
              >
                ⚙️ カスタム座標
              </button>
            </div>
          </div>

          {!useFixed ? (
            /* プリセットモード */
            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc', marginBottom: 8 }}>
                  表示位置
                </div>
                <select 
                  value={l.positionPreset ?? 'center'} 
                  onChange={e => update({ layout: { positionPreset: e.target.value } })} 
                  style={{ 
                    width: '100%',
                    padding: '12px 16px',
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #3a3a3a',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                >
                  <optgroup label="上部配置">
                    <option value="top_left">↖ 左上 (top_left)</option>
                    <option value="top_center">↑ 上中央 (top_center)</option>
                    <option value="top_right">↗ 右上 (top_right)</option>
                  </optgroup>
                  <optgroup label="中央配置">
                    <option value="left">← 左中央 (left)</option>
                    <option value="center">◎ 中央 (center)</option>
                    <option value="right">→ 右中央 (right)</option>
                  </optgroup>
                  <optgroup label="下部配置">
                    <option value="bottom_left">↙ 左下 (bottom_left)</option>
                    <option value="bottom_center">↓ 下中央 (bottom_center)</option>
                    <option value="bottom_right">↘ 右下 (bottom_right)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <div style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: '500', 
                  color: '#ccc', 
                  marginBottom: 12 
                }}>
                  表示サイズ比率
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.8rem', 
                      color: '#aaa', 
                      marginBottom: 8 
                    }}>
                      横幅比率
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05"
                        value={l.widthRatio ?? 1.0} 
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          update({ 
                            layout: { 
                              widthRatio: isNaN(val) ? 1.0 : val,
                              width: null
                            } 
                          });
                        }}
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <input 
                        type="number" 
                        step="0.05" 
                        min="0" 
                        max="1"
                        value={l.widthRatio ?? 1.0} 
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          update({ 
                            layout: { 
                              widthRatio: isNaN(val) ? 1.0 : val,
                              width: null
                            } 
                          });
                        }}
                        style={{ 
                          width: 70,
                          padding: '6px 8px',
                          background: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #3a3a3a',
                          borderRadius: 4,
                          textAlign: 'center',
                          flexShrink: 0
                        }}
                      />
                    </div>
                    {imageDimensions.width && (
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#888', 
                        marginTop: 6,
                        padding: '6px 8px',
                        background: '#1a1a1a',
                        borderRadius: 4,
                        border: '1px solid #2a2a2a',
                        overflow: 'hidden'
                      }}>
                        <div>画像幅: <strong>{imageDimensions.width}px</strong></div>
                        <div>表示幅: <strong style={{ color: '#0ff' }}>
                          {Math.round(imageDimensions.width * (l.widthRatio ?? 1.0))}px
                        </strong></div>
                      </div>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.8rem', 
                      color: '#aaa', 
                      marginBottom: 8 
                    }}>
                      縦幅比率
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05"
                        value={l.heightRatio ?? 1.0} 
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          update({ 
                            layout: { 
                              heightRatio: isNaN(val) ? 1.0 : val,
                              height: null
                            } 
                          });
                        }}
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <input 
                        type="number" 
                        step="0.05" 
                        min="0" 
                        max="1"
                        value={l.heightRatio ?? 1.0} 
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          update({ 
                            layout: { 
                              heightRatio: isNaN(val) ? 1.0 : val,
                              height: null
                            } 
                          });
                        }}
                        style={{ 
                          width: 70,
                          padding: '6px 8px',
                          background: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #3a3a3a',
                          borderRadius: 4,
                          textAlign: 'center',
                          flexShrink: 0
                        }}
                      />
                    </div>
                    {imageDimensions.height && (
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#888', 
                        marginTop: 6,
                        padding: '6px 8px',
                        background: '#1a1a1a',
                        borderRadius: 4,
                        border: '1px solid #2a2a2a',
                        overflow: 'hidden'
                      }}>
                        <div>画像高: <strong>{imageDimensions.height}px</strong></div>
                        <div>表示高: <strong style={{ color: '#0ff' }}>
                          {Math.round(imageDimensions.height * (l.heightRatio ?? 1.0))}px
                        </strong></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* カスタム座標モード */
            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc', marginBottom: 12 }}>
                  座標設定
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: 6 }}>
                      X座標 (px)
                    </label>
                    <input 
                      type="number" 
                      value={l.x ?? 0} 
                      onChange={e => update({ layout: { x: Number(e.target.value) } })} 
                      style={{ 
                        width: '100%',
                        padding: '10px 12px',
                        background: '#1a1a1a',
                        color: '#fff',
                        border: '1px solid #3a3a3a',
                        borderRadius: 6,
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: 6 }}>
                      Y座標 (px)
                    </label>
                    <input 
                      type="number" 
                      value={l.y ?? 0} 
                      onChange={e => update({ layout: { y: Number(e.target.value) } })} 
                      style={{ 
                        width: '100%',
                        padding: '10px 12px',
                        background: '#1a1a1a',
                        color: '#fff',
                        border: '1px solid #3a3a3a',
                        borderRadius: 6,
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc', marginBottom: 12 }}>
                  サイズ設定
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: 6 }}>
                      幅 (px)
                    </label>
                    <input 
                      type="number" 
                      value={l.width ?? ''} 
                      onChange={e => update({ layout: { width: Number(e.target.value) || null } })} 
                      style={{ 
                        width: '100%',
                        padding: '10px 12px',
                        background: '#1a1a1a',
                        color: '#fff',
                        border: '1px solid #3a3a3a',
                        borderRadius: 6,
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                      placeholder="自動"
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: 6 }}>
                      高さ (px)
                    </label>
                    <input 
                      type="number" 
                      value={l.height ?? ''} 
                      onChange={e => update({ layout: { height: Number(e.target.value) || null } })} 
                      style={{ 
                        width: '100%',
                        padding: '10px 12px',
                        background: '#1a1a1a',
                        color: '#fff',
                        border: '1px solid #3a3a3a',
                        borderRadius: 6,
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                      placeholder="自動"
                    />
                  </div>
                </div>
              </div>
              
              <div style={{ 
                padding: '12px 16px',
                background: '#1a2a1a',
                borderRadius: 6,
                border: '1px solid #2a4a2a'
              }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#8f8',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8
                }}>
                  <span>ℹ️</span>
                  <span>座標指定時は、キャンバスサイズ内に自動的に調整されます。<br/>
                  （0 ~ {canvas.width - (l.width || 0)}px, 0 ~ {canvas.height - (l.height || 0)}px）</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== セクション 4: フィルター効果 ===== */}
      <div style={{ 
        border: '1px solid #333', 
        borderRadius: 8, 
        overflow: 'hidden',
        background: 'linear-gradient(to bottom, #252525, #1e1e1e)'
      }}>
        <div style={{ 
          padding: '16px 20px', 
          background: '#2a2a2a',
          borderBottom: '1px solid #333'
        }}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#4af' }}>🔮</span>
            フィルター効果
          </h4>
        </div>
        
        <div style={{ padding: '20px', display: 'grid', gap: 20 }}>
          {[
            { key: 'brightness', label: '明るさ', min: 0, max: 2, step: 0.1, defaultValue: 1.0 },
            { key: 'contrast', label: 'コントラスト', min: 0, max: 2, step: 0.1, defaultValue: 1.0 },
            { key: 'saturation', label: '彩度', min: 0, max: 2, step: 0.1, defaultValue: 1.0 },
            { key: 'blur', label: 'ぼかし', min: 0, max: 20, step: 0.5, defaultValue: 0 }
          ].map(filter => {
            const value = f[filter.key] ?? filter.defaultValue;
            return (
              <div key={filter.key} style={{ display: 'grid', gap: 8 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc' }}>
                    {filter.label}
                  </label>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input 
                    type="range" 
                    min={filter.min} 
                    max={filter.max} 
                    step={filter.step}
                    value={value} 
                    onChange={e => update({ filters: { [filter.key]: Number(e.target.value) } })} 
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <span style={{ 
                    minWidth: 60,
                    textAlign: 'center', 
                    background: '#1a1a1a', 
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: '1px solid #3a3a3a',
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}>
                    {filter.key === 'blur' ? `${value}px` : value.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== セクション 5: 枠・背景 ===== */}
      <div style={{ 
        border: '1px solid #333', 
        borderRadius: 8, 
        overflow: 'hidden',
        background: 'linear-gradient(to bottom, #252525, #1e1e1e)'
      }}>
        <div style={{ 
          padding: '16px 20px', 
          background: '#2a2a2a',
          borderBottom: '1px solid #333'
        }}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#4af' }}>🖼️</span>
            枠・背景
          </h4>
        </div>
        
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gap: 20 }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12,
              fontSize: '0.9rem',
              color: '#ccc',
              padding: '12px 16px',
              background: b.enabled ? '#1a2a1a' : '#1a1a1a',
              borderRadius: 8,
              border: `1px solid ${b.enabled ? '#3a5a3a' : '#3a3a3a'}`
            }}>
              <input
                type="checkbox"
                checked={!!b.enabled}
                onChange={e => update({ box: { enabled: e.target.checked } })}
                style={{
                  width: 20,
                  height: 20,
                  accentColor: '#4af'
                }}
              />
              <div>
                <div style={{ fontWeight: '500' }}>枠・背景を表示する</div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 2 }}>
                  画像の背景に枠や色を追加します
                </div>
              </div>
            </label>

            {!!b.enabled && (
              <div style={{ 
                padding: '20px', 
                background: '#1a1a1a',
                borderRadius: 8,
                border: '1px solid #3a3a3a',
                display: 'grid',
                gap: 16
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: 8 }}>
                      背景色
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input 
                        type="color" 
                        value={b.background ?? 'rgba(0,0,0,0.4)'} 
                        onChange={e => update({ box: { background: e.target.value } })} 
                        style={{ 
                          width: 50,
                          height: 40,
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      />
                      <input 
                        type="text" 
                        value={b.background ?? 'rgba(0,0,0,0.4)'} 
                        onChange={e => update({ box: { background: e.target.value } })} 
                        style={{ 
                          flex: 1,
                          padding: '10px 12px',
                          background: '#151515',
                          color: '#fff',
                          border: '1px solid #3a3a3a',
                          borderRadius: 6,
                          fontSize: '0.85rem',
                          minWidth: 0
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: 8 }}>
                      枠色
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input 
                        type="color" 
                        value={b.borderColor ?? '#444488'} 
                        onChange={e => update({ box: { borderColor: e.target.value } })} 
                        style={{ 
                          width: 50,
                          height: 40,
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      />
                      <input 
                        type="text" 
                        value={b.borderColor ?? '#444488'} 
                        onChange={e => update({ box: { borderColor: e.target.value } })} 
                        style={{ 
                          flex: 1,
                          padding: '10px 12px',
                          background: '#151515',
                          color: '#fff',
                          border: '1px solid #3a3a3a',
                          borderRadius: 6,
                          fontSize: '0.85rem',
                          minWidth: 0
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: 8 }}>
                      枠の太さ (px)
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      max="20"
                      step="1"
                      value={b.borderWidth ?? 0} 
                      onChange={e => update({ box: { borderWidth: Number(e.target.value) } })} 
                      style={{ 
                        width: '100%',
                        padding: '10px 12px',
                        background: '#151515',
                        color: '#fff',
                        border: '1px solid #3a3a3a',
                        borderRadius: 6,
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: 8 }}>
                      角丸 (px)
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      max="50"
                      step="1"
                      value={b.borderRadius ?? 0} 
                      onChange={e => update({ box: { borderRadius: Number(e.target.value) } })} 
                      style={{ 
                        width: '100%',
                        padding: '10px 12px',
                        background: '#151515',
                        color: '#fff',
                        border: '1px solid #3a3a3a',
                        borderRadius: 6,
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* アニメーションセクションは削除 */}
      
    </div>
  );
}