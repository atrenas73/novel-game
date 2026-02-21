import { useState, useEffect } from 'react';
import TypingPreviewBox from '../utils/TypingPreviewBox';
import { useTextStyles, useReloadTextStyles } from '../contexts/TextStyleContext';

/* =========================
 * 定数・デフォルト値
 * ========================= */
const DEFAULT_CANVAS = { width: 1280, height: 720 };
const DEFAULT_SCALE = 1.00;
const SAMPLE_TEXT =
  'これはプレビュー用のサンプルテキストです。\n複数行の表示具合も確認できます。\n三行目です。';

/* =========================
 * レイアウト計算（改善版）
 * ========================= */
function resolveLayout(layout = {}, canvas, imageDimensions) {
  const {
    x = null,
    y = null,
    width = null,
    height = null,
    widthRatio = null,
    heightRatio = null,
    positionPreset = 'bottom_center',
    margin = 0,
  } = layout;

  let finalWidth = width ?? (widthRatio != null ? Math.round(canvas.width * widthRatio) : canvas.width);
  let finalHeight = height ?? (heightRatio != null ? Math.round(canvas.height * heightRatio) : Math.round(canvas.height * 0.25));

  let finalX = x;
  let finalY = y;

  if (x == null || y == null) {
    let rx = 0;
    let ry = 0;
    switch (positionPreset) {
      case 'top_left': rx = margin; ry = margin; break;
      case 'top_center': rx = Math.round((canvas.width - finalWidth) / 2); ry = margin; break;
      case 'top_right': rx = canvas.width - finalWidth - margin; ry = margin; break;
      case 'bottom_left': rx = margin; ry = canvas.height - finalHeight - margin; break;
      case 'bottom_center': rx = Math.round((canvas.width - finalWidth) / 2); ry = canvas.height - finalHeight - margin; break;
      case 'bottom_right': rx = canvas.width - finalWidth - margin; ry = canvas.height - finalHeight - margin; break;
      case 'center':
      default: rx = Math.round((canvas.width - finalWidth) / 2); ry = Math.round((canvas.height - finalHeight) / 2); break;
    }
    finalX = x ?? rx;
    finalY = y ?? ry;
  }

  finalX = Math.max(0, Math.min(finalX, canvas.width - finalWidth));
  finalY = Math.max(0, Math.min(finalY, canvas.height - finalHeight));

  return { x: finalX, y: finalY, width: finalWidth, height: finalHeight };
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
          新規テキストスタイルの作成
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#ccc', marginBottom: 8, fontWeight: '500' }}>
                スタイルキー
                <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: 6 }}>
                  （半角英数字と_のみ、例: Comment_Default）
                </span>
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="例: Comment_Default"
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
                placeholder="例: デフォルトコメント"
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
export default function TextStyleEditor({ canvas = DEFAULT_CANVAS }) {
  const [styles, setStyles] = useState({});
  const [activeKey, setActiveKey] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    window.electronAPI.loadTextStyle().then((json) => {
      if (!json || typeof json !== 'object') return;
      setStyles(json);
      const keys = Object.keys(json);
      if (keys.length > 0) {
        setActiveKey(keys[0]);
      }
      console.log('loaded color:', json[keys[0]]?.font?.color);
    });
  }, []);

  const [previewText, setPreviewText] = useState(SAMPLE_TEXT);
  const [userScale, setUserScale] = useState(DEFAULT_SCALE);

  const currentStyle = styles[activeKey];

  const handleChange = (patch) => {
    setStyles(prev => ({
      ...prev,
      [activeKey]: {
        ...prev[activeKey],
        ...patch,
        font: patch.font ? { ...prev[activeKey].font, ...patch.font } : prev[activeKey].font,
        layout: patch.layout ? { ...prev[activeKey].layout, ...patch.layout } : prev[activeKey].layout,
        box: patch.box ? { ...prev[activeKey].box, ...patch.box } : prev[activeKey].box,
        typing: patch.typing ? { ...prev[activeKey].typing, ...patch.typing } : prev[activeKey].typing,
      },
    }));
  };

  const reloadTextStyles = useReloadTextStyles();

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
        maxLines: 4,
        font: { 
          family: "'Noto Sans JP','Yu Gothic',sans-serif", 
          size: 28, 
          color: "#ffffff", 
          lineHeight: 1.4, 
          bold: false, 
          italic: false, 
          strike: false 
        },
        layout: { 
          x: null, 
          y: null, 
          width: null, 
          height: null, 
          widthRatio: 0.95, 
          heightRatio: 0.25, 
          padding: 5, 
          alignHorizontal: "center", 
          alignVertical: "middle", 
          positionPreset: "bottom_center", 
          margin: 10 
        },
        box: { 
          enabled: true, 
          background: "rgba(0,0,30,0.65)", 
          borderColor: "#6666aa", 
          borderWidth: 1, 
          borderRadius: 4 
        },
        typing: { 
          enabled: true, 
          speed: 50, 
          allowSkip: true 
        },
        layer: "text_main",
      };
    }

    setStyles(prev => ({ ...prev, [key]: base }));
    setActiveKey(key);

    console.log('[TextStyleEditor] 新規スタイル作成:', { key, label, baseStyleKey });
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

    console.log('[TextStyleEditor] スタイル削除:', activeKey);
  };

  const handleSave = async () => {
    const confirmed = window.confirm('TextStyle.json を上書き保存しますか？\nメイン画面に反映されます。');
    if (!confirmed) return;
    try {
      await window.electronAPI.saveTextStyle(styles);
      console.log('[TextStyleEditor] 保存完了');

      const freshData = await window.electronAPI.loadTextStyle();
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
        console.log('[TextStyleEditor] メインに保存通知送信完了');
      } else {
        console.warn('[TextStyleEditor] notifyStyleSaved が定義されていません');
      }

      alert('保存しました！ メイン画面に反映されます');
    } catch (err) {
      console.error('[TextStyleEditor] 保存失敗', err);
      alert('保存に失敗しました');
    }
  };

  // 現在のスタイルのレイアウトを計算
  const currentResolved = currentStyle 
    ? resolveLayout(currentStyle.layout, canvas)
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
          <h2 style={{ margin: 0 }}>テキストスタイル エディター</h2>
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
              💾 保存（TextStyle.json）
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

                <TypingPreviewBox
                  style={currentStyle}
                  resolved={currentResolved}
                  text={previewText}
                  maxLines={currentStyle?.maxLines ?? 999}
                />
              </div>
            </div>

            {/* プレビューテキスト入力 */}
            <div
              style={{
                background: '#222',
                padding: 12,
                borderRadius: 6,
                border: '1px solid #444',
              }}
            >
              <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: 8, display: 'block' }}>
                プレビュー用テキスト
              </label>
              <textarea
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="ここにプレビュー用のテキストを入力..."
                rows={3}
                style={{
                  width: '100%',
                  padding: 10,
                  background: '#1a1a1a',
                  color: '#eee',
                  border: '1px solid #3a3a3a',
                  borderRadius: 4,
                  resize: 'vertical',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>

          {/* 編集フォーム */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
            {currentStyle ? (
              <EditorForm
                currentStyle={currentStyle}
                onChange={handleChange}
                currentResolved={currentResolved}
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
                <div style={{ fontSize: '4rem', marginBottom: 20 }}>📝</div>
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
 * 編集フォーム（ImageStyleEditorと統一したレイアウト）
 * ========================= */
function EditorForm({ currentStyle, onChange, currentResolved, canvas }) {
  if (!currentStyle) return <div>スタイルを選択してください</div>;

  const update = (patch) => onChange(patch);

  const f = currentStyle.font || {};
  const l = currentStyle.layout || {};
  const b = currentStyle.box || {};
  const t = currentStyle.typing || {};

  const useFixed = l.x !== null || l.y !== null;

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
              最大行数
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1"
                value={currentStyle.maxLines ?? 4} 
                onChange={e => update({ maxLines: Number(e.target.value) })} 
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
                {currentStyle.maxLines ?? 4}行
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== セクション 2: フォント設定 ===== */}
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
            <span style={{ color: '#4af' }}>🔤</span>
            フォント設定
          </h4>
        </div>
        
        <div style={{ padding: '20px', display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc' }}>
              フォントファミリー
            </label>
            <input
              value={f.family ?? "'Noto Sans JP','Yu Gothic',sans-serif"}
              onChange={e => update({ font: { family: e.target.value } })}
              placeholder="例: 'Noto Sans JP', sans-serif"
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
              フォントサイズ
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input 
                type="range" 
                min="8" 
                max="72" 
                step="1"
                value={f.size ?? 28} 
                onChange={e => update({ font: { size: Number(e.target.value) } })} 
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
                {f.size ?? 28}px
              </span>
            </div>
          </div>
          
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc' }}>
              文字色
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input 
                type="color" 
                value={f.color ?? '#ffffff'} 
                onChange={e => update({ font: { color: e.target.value } })} 
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
                value={f.color ?? '#ffffff'} 
                onChange={e => update({ font: { color: e.target.value } })} 
                style={{ 
                  flex: 1,
                  padding: '10px 12px',
                  background: '#1a1a1a',
                  color: '#fff',
                  border: '1px solid #3a3a3a',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                  minWidth: 0
                }}
              />
            </div>
          </div>
          
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc' }}>
              行高
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input 
                type="range" 
                min="1.0" 
                max="2.0" 
                step="0.1"
                value={f.lineHeight ?? 1.4} 
                onChange={e => update({ font: { lineHeight: parseFloat(e.target.value) } })} 
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
                {f.lineHeight ?? 1.4}
              </span>
            </div>
          </div>
          
          <div style={{ 
            padding: '16px', 
            background: '#1a1a1a',
            borderRadius: 6,
            border: '1px solid #3a3a3a'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc', marginBottom: 12 }}>
              フォントスタイル
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                fontSize: '0.9rem',
                color: '#ccc',
                padding: '8px 12px',
                background: f.bold ? '#1a2a1a' : '#151515',
                borderRadius: 6,
                border: `1px solid ${f.bold ? '#3a5a3a' : '#3a3a3a'}`
              }}>
                <input
                  type="checkbox"
                  checked={!!f.bold}
                  onChange={e => update({ font: { bold: e.target.checked }})}
                  style={{ width: 18, height: 18, accentColor: '#4af' }}
                />
                太字
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                fontSize: '0.9rem',
                color: '#ccc',
                padding: '8px 12px',
                background: f.italic ? '#1a2a1a' : '#151515',
                borderRadius: 6,
                border: `1px solid ${f.italic ? '#3a5a3a' : '#3a3a3a'}`
              }}>
                <input
                  type="checkbox"
                  checked={!!f.italic}
                  onChange={e => update({ font: { italic: e.target.checked }})}
                  style={{ width: 18, height: 18, accentColor: '#4af' }}
                />
                斜体
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                fontSize: '0.9rem',
                color: '#ccc',
                padding: '8px 12px',
                background: f.strike ? '#1a2a1a' : '#151515',
                borderRadius: 6,
                border: `1px solid ${f.strike ? '#3a5a3a' : '#3a3a3a'}`
              }}>
                <input
                  type="checkbox"
                  checked={!!f.strike}
                  onChange={e => update({ font: { strike: e.target.checked }})}
                  style={{ width: 18, height: 18, accentColor: '#4af' }}
                />
                取消線
              </label>
            </div>
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
                <div style={{ fontSize: '0.75rem', color: '#a0c0ff', marginBottom: 4 }}>配置モード</div>
                <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                  {useFixed ? 'カスタム座標' : 'プリセット配置'}
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
                    width: null,
                    height: null
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
                  value={l.positionPreset ?? 'bottom_center'} 
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
                    <option value="center">◎ 中央 (center)</option>
                  </optgroup>
                  <optgroup label="下部配置">
                    <option value="bottom_left">↙ 左下 (bottom_left)</option>
                    <option value="bottom_center">↓ 下中央 (bottom_center)</option>
                    <option value="bottom_right">↘ 右下 (bottom_right)</option>
                  </optgroup>
                </select>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: '500', 
                    color: '#ccc', 
                    marginBottom: 8 
                  }}>
                    テキスト揃え
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: 6 }}>
                        横揃え
                      </label>
                      <select 
                        value={l.alignHorizontal ?? 'center'} 
                        onChange={e => update({ layout: { alignHorizontal: e.target.value } })} 
                        style={{ 
                          width: '100%',
                          padding: '10px 12px',
                          background: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #3a3a3a',
                          borderRadius: 6,
                          fontSize: '0.85rem',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="left">左揃え</option>
                        <option value="center">中央揃え</option>
                        <option value="right">右揃え</option>
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: 6 }}>
                        縦揃え
                      </label>
                      <select 
                        value={l.alignVertical ?? 'middle'} 
                        onChange={e => update({ layout: { alignVertical: e.target.value } })} 
                        style={{ 
                          width: '100%',
                          padding: '10px 12px',
                          background: '#1a1a1a',
                          color: '#fff',
                          border: '1px solid #3a3a3a',
                          borderRadius: 6,
                          fontSize: '0.85rem',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="top">上揃え</option>
                        <option value="middle">中央揃え</option>
                        <option value="bottom">下揃え</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: '500', 
                    color: '#ccc', 
                    marginBottom: 8 
                  }}>
                    サイズ設定
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
                          min="0.1" 
                          max="1.0" 
                          step="0.05"
                          value={l.widthRatio ?? 0.95} 
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            update({ 
                              layout: { 
                                widthRatio: isNaN(val) ? 0.95 : val,
                                width: null
                              } 
                            });
                          }}
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
                          {l.widthRatio ?? 0.95}
                        </span>
                      </div>
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
                          min="0.1" 
                          max="1.0" 
                          step="0.05"
                          value={l.heightRatio ?? 0.25} 
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            update({ 
                              layout: { 
                                heightRatio: isNaN(val) ? 0.25 : val,
                                height: null
                              } 
                            });
                          }}
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
                          {l.heightRatio ?? 0.25}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.8rem', 
                      color: '#aaa', 
                      marginBottom: 6 
                    }}>
                      パディング (px)
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100"
                      step="1"
                      value={l.padding ?? 5} 
                      onChange={e => update({ layout: { padding: Number(e.target.value) } })} 
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
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.8rem', 
                      color: '#aaa', 
                      marginBottom: 6 
                    }}>
                      マージン (px)
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100"
                      step="1"
                      value={l.margin ?? 10} 
                      onChange={e => update({ layout: { margin: Number(e.target.value) } })} 
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
                      onChange={e => update({ layout: { width: e.target.value ? Number(e.target.value) : null } })} 
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
                      onChange={e => update({ layout: { height: e.target.value ? Number(e.target.value) : null } })} 
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

              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc', marginBottom: 12 }}>
                  テキスト揃え
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: 6 }}>
                      横揃え
                    </label>
                    <select 
                      value={l.alignHorizontal ?? 'center'} 
                      onChange={e => update({ layout: { alignHorizontal: e.target.value } })} 
                      style={{ 
                        width: '100%',
                        padding: '10px 12px',
                        background: '#1a1a1a',
                        color: '#fff',
                        border: '1px solid #3a3a3a',
                        borderRadius: 6,
                        fontSize: '0.85rem',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="left">左揃え</option>
                      <option value="center">中央揃え</option>
                      <option value="right">右揃え</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: 6 }}>
                      縦揃え
                    </label>
                    <select 
                      value={l.alignVertical ?? 'middle'} 
                      onChange={e => update({ layout: { alignVertical: e.target.value } })} 
                      style={{ 
                        width: '100%',
                        padding: '10px 12px',
                        background: '#1a1a1a',
                        color: '#fff',
                        border: '1px solid #3a3a3a',
                        borderRadius: 6,
                        fontSize: '0.85rem',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="top">上揃え</option>
                      <option value="middle">中央揃え</option>
                      <option value="bottom">下揃え</option>
                    </select>
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
                  <span>座標指定時は、キャンバスサイズ内に自動的に調整されます。</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== セクション 4: 枠・背景 ===== */}
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
                  テキストの背景に枠や色を追加します
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
                        value={b.background ?? 'rgba(0,0,30,0.65)'} 
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
                        value={b.background ?? 'rgba(0,0,30,0.65)'} 
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
                        value={b.borderColor ?? '#6666aa'} 
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
                        value={b.borderColor ?? '#6666aa'} 
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
                      value={b.borderWidth ?? 1} 
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
                      value={b.borderRadius ?? 4} 
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

      {/* ===== セクション 5: 文字送り (タイピングアニメーション) ===== */}
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
            <span style={{ color: '#4af' }}>⌨️</span>
            文字送り (タイピングアニメーション)
          </h4>
        </div>
        
        <div style={{ padding: '20px', display: 'grid', gap: 20 }}>
          <div style={{ 
            padding: '16px', 
            background: '#1a1a1a',
            borderRadius: 6,
            border: '1px solid #3a3a3a'
          }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12,
              fontSize: '0.9rem',
              color: '#ccc',
              padding: '8px 0'
            }}>
              <input
                type="checkbox"
                checked={!!t.enabled}
                onChange={e => update({ typing: { enabled: e.target.checked } })}
                style={{
                  width: 20,
                  height: 20,
                  accentColor: '#4af'
                }}
              />
              <div>
                <div style={{ fontWeight: '500' }}>タイピングアニメーションを有効にする</div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 2 }}>
                  文字が1文字ずつ表示されるアニメーション効果
                </div>
              </div>
            </label>
          </div>

          {t.enabled && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ccc' }}>
                  表示速度
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input 
                    type="range" 
                    min="10" 
                    max="200" 
                    step="5"
                    value={t.speed ?? 50} 
                    onChange={e => update({ typing: { speed: Number(e.target.value) } })} 
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
                    {t.speed ?? 50}ms/文字
                  </span>
                </div>
              </div>
              
              <div style={{ 
                padding: '12px 16px',
                background: '#1a1a1a',
                borderRadius: 6,
                border: '1px solid #3a3a3a'
              }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10,
                  fontSize: '0.9rem',
                  color: '#ccc'
                }}>
                  <input
                    type="checkbox"
                    checked={!!t.allowSkip}
                    onChange={e => update({ typing: { allowSkip: e.target.checked } })}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: '#4af'
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: '500' }}>クリックでスキップを許可</div>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 2 }}>
                      ユーザーがクリックするとすべての文字が即時表示されます
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}