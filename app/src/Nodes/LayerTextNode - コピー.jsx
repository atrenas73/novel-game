import { memo, useCallback, useRef, useEffect, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from '../Nodes/BaseNode';

const INPUT_STYLE = {
  width: 70,
  fontSize: 11,
};

const SMALL_INPUT_STYLE = {
  width: 60,
  fontSize: 11,
};

// rgba → hex
const rgbaToHex = (rgba) => {
  if (typeof rgba !== 'string' || !rgba.startsWith('rgba')) return '#00001e';
  const m = rgba.match(/[\d.]+/g);
  if (!m || m.length < 3) return '#00001e';
  const [r, g, b] = m.map(Number);
  return (
    '#' +
    [r, g, b]
      .map((x) => Math.round(x).toString(16).padStart(2, '0'))
      .join('')
  );
};

// hex → rgba
const hexToRgba = (hex, alpha = 0.65) => {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) {
    return `rgba(0,0,30,${alpha})`;
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const LayerTextNode = (props) => {
  const { data, id } = props;
  const textSpanRef = useRef(null);

  // Config defaults
  const cfg = data.editorConfig ?? {};
  const canvasCfg = cfg.canvas ?? {};
  const textCfg = cfg.text ?? {};
  const defaultBgW = canvasCfg.width ?? 1280;
  const defaultBgH = canvasCfg.height ?? 720;
  const defaultFont = textCfg.font ?? "'Noto Sans JP','Yu Gothic',sans-serif";
  const defaultFontSize = textCfg.size ?? 28;
  const defaultTextColor = textCfg.color ?? '#e0e0ff';
  const defaultBoxBg = textCfg.boxBackground ?? 'rgba(0,0,30,0.65)';
  const defaultBoxBorder = textCfg.boxBorder ?? '#6666aa';
  const defaultPadding = textCfg.padding ?? 24;

  // 初期値保証
  useEffect(() => {
    const u = {};
    let dirty = false;
    const ensure = (k, v) => {
      if (data[k] === undefined || data[k] === null) {
        u[k] = v;
        dirty = true;
      }
    };

    ensure('backgroundWidth', defaultBgW);
    ensure('backgroundHeight', defaultBgH);
    ensure('layer', 'text_main');
    ensure('font', defaultFont);
    ensure('fontSize', defaultFontSize);
    ensure('textColor', defaultTextColor);
    ensure('boxBackground', defaultBoxBg);
    ensure('boxBorderColor', defaultBoxBorder);
    ensure('padding', defaultPadding);
    ensure('text', '');  // ここを確実に空文字列に
    ensure('x', 0);
    ensure('y', 0);
    ensure('textAlign', 'left');
    ensure('showBox', true);

    // 矩形配置関連
    ensure('textWidth', Math.round(defaultBgW * 0.7));
    ensure('textHeight', Math.round(defaultBgH * 0.25));
    ensure('textAlignHorizontal', 'center');
    ensure('textAlignVertical', 'middle');

    // タイピング演出関連
    ensure('typingEnabled', true);
    ensure('typingSpeed', 50);
    ensure('maxSpeedMode', false);

    if (dirty) {
      data.onChange?.(data.nodeId || id, { ...data, ...u });
    }
  }, [data, id, defaultBgW, defaultBgH]);

  // ノードサイズ同期
  useEffect(() => {
    if (!data.backgroundWidth || !data.backgroundHeight) return;
    props.setNodes?.((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              style: {
                ...n.style,
                width: data.backgroundWidth,
                height: data.backgroundHeight + 280,
              },
            }
          : n
      )
    );
  }, [data.backgroundWidth, data.backgroundHeight, id, props.setNodes]);

  const update = useCallback(
    (patch) => {
      data.onChange?.(data.nodeId, { ...data, ...patch });
    },
    [data]
  );

  const bgW = data.backgroundWidth ?? defaultBgW;
  const bgH = data.backgroundHeight ?? defaultBgH;
  const zIndex = cfg.layers?.[data.layer]?.z ?? 50;

  // プレビュー用タイピング演出
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!data || typeof data.text !== 'string') {
      setDisplayedText('');
      return;
    }

    if (!data.typingEnabled || data.maxSpeedMode) {
      setDisplayedText(data.text);
      return;
    }

    const chars = Array.from(data.text);
    let index = 0;
    setDisplayedText('');

    const interval = setInterval(() => {
      if (index >= chars.length) {
        setDisplayedText(data.text);
        clearInterval(interval);
        return;
      }

      const char = chars[index];
      index++;

      setDisplayedText(prev => prev + char);
    }, Math.max(10, data.typingSpeed ?? 50));

    return () => clearInterval(interval);
  }, [
    data?.text,
    data?.typingEnabled,
    data?.typingSpeed,
    data?.maxSpeedMode,
  ]);
  // 矩形の9方向配置
  const setRectAlign = useCallback(
    (mode) => {
      const rw = data.textWidth ?? Math.round(bgW * 0.7);
      const rh = data.textHeight ?? Math.round(bgH * 0.25);
      let x = 0;
      let y = 0;

      switch (mode) {
        case 'left_top': x = 0; y = 0; break;
        case 'top': x = Math.round((bgW - rw) / 2); y = 0; break;
        case 'right_top': x = Math.round(bgW - rw); y = 0; break;
        case 'left': x = 0; y = Math.round((bgH - rh) / 2); break;
        case 'center': x = Math.round((bgW - rw) / 2); y = Math.round((bgH - rh) / 2); break;
        case 'right': x = Math.round(bgW - rw); y = Math.round((bgH - rh) / 2); break;
        case 'left_bottom': x = 0; y = Math.round(bgH - rh); break;
        case 'bottom': x = Math.round((bgW - rw) / 2); y = Math.round(bgH - rh); break;
        case 'right_bottom': x = Math.round(bgW - rw); y = Math.round(bgH - rh); break;
        default: return;
      }

      update({ x: Math.round(x), y: Math.round(y) });
    },
    [bgW, bgH, data.textWidth, data.textHeight, update]
  );

  const boxBgHex = rgbaToHex(data.boxBackground ?? defaultBoxBg);
  const borderHex = data.boxBorderColor?.startsWith('#') ? data.boxBorderColor : defaultBoxBorder;

  return (
    <BaseNode {...props}>
      <div
        className="nodrag"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* プレビュー */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: bgW,
              height: bgH,
              background: '#000',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid #333',
            }}
          >
            {data.text ? (
              <div
                style={{
                  position: 'absolute',
                  left: `${data.x ?? 0}px`,
                  top: `${data.y ?? 0}px`,
                  width: `${data.textWidth ?? Math.round(bgW * 0.7)}px`,
                  height: `${data.textHeight ?? Math.round(bgH * 0.25)}px`,
                  color: data.textColor ?? defaultTextColor,
                  fontFamily: data.font ?? defaultFont,
                  fontSize: `${data.fontSize ?? defaultFontSize}px`,
                  lineHeight: 1.4,
                  display: 'flex',
                  justifyContent:
                    data.textAlignHorizontal === 'center' ? 'center' :
                    data.textAlignHorizontal === 'right' ? 'flex-end' : 'flex-start',
                  alignItems:
                    data.textAlignVertical === 'middle' ? 'center' :
                    data.textAlignVertical === 'bottom' ? 'flex-end' : 'flex-start',
                  padding: `${data.padding ?? defaultPadding}px`,
                  boxSizing: 'border-box',
                  background: data.showBox ? (data.boxBackground ?? defaultBoxBg) : 'transparent',
                  border: data.showBox ? `1px solid ${data.boxBorderColor ?? defaultBoxBorder}` : 'none',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div ref={textSpanRef} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {displayedText ?? ''}
                  {data?.typingEnabled &&
                   !data?.maxSpeedMode &&
                   (displayedText?.length ?? 0) < (data?.text?.length ?? 0) && (
                    <span style={{ opacity: 0.7, marginLeft: 3 }}>|</span>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  color: '#777',
                  fontSize: 12,
                  textAlign: 'center',
                  lineHeight: `${bgH}px`,
                }}
              >
                テキストを入力してください
              </div>
            )}
          </div>
        </div>

        {/* コントロール部分（省略せずに全文） */}
        <div
          style={{
            fontSize: 11,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '0 16px 16px',
            width: '100%',
            maxWidth: bgW,
          }}
        >
          {/* テキスト入力 */}
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>テキスト内容</label>
            <textarea
              rows={5}
              value={data.text ?? ''}
              onChange={(e) => update({ text: e.target.value })}
              style={{
                width: '100%',
                fontSize: 13,
                padding: 8,
                background: '#1e1e1e',
                color: '#e0e0ff',
                border: '1px solid #444',
                borderRadius: 6,
                resize: 'vertical',
                minHeight: 80,
              }}
            />
          </div>

          <div style={{ borderTop: '1px solid #333', paddingTop: 12, marginTop: 8 }}>
            {/* 表示矩形サイズ & 位置 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
              <span style={{ minWidth: 70 }}>矩形サイズ</span>
              W <input type="number" style={INPUT_STYLE} value={data.textWidth ?? ''} onChange={e => update({ textWidth: Number(e.target.value) })} />
              H <input type="number" style={INPUT_STYLE} value={data.textHeight ?? ''} onChange={e => update({ textHeight: Number(e.target.value) })} />
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
              <span style={{ minWidth: 70 }}>位置</span>
              X <input type="number" style={INPUT_STYLE} value={data.x ?? 0} onChange={e => update({ x: Number(e.target.value) })} />
              Y <input type="number" style={INPUT_STYLE} value={data.y ?? 0} onChange={e => update({ y: Number(e.target.value) })} />
            </div>

            {/* 9方向ボタン */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 6,
                maxWidth: 240,
                margin: '0 auto 12px',
              }}
            >
              <button onClick={() => setRectAlign('left_top')}>左上</button>
              <button onClick={() => setRectAlign('top')}>上</button>
              <button onClick={() => setRectAlign('right_top')}>右上</button>
              <button onClick={() => setRectAlign('left')}>左</button>
              <button onClick={() => setRectAlign('center')}>中</button>
              <button onClick={() => setRectAlign('right')}>右</button>
              <button onClick={() => setRectAlign('left_bottom')}>左下</button>
              <button onClick={() => setRectAlign('bottom')}>下</button>
              <button onClick={() => setRectAlign('right_bottom')}>右下</button>
            </div>

            {/* 内部テキスト配置 */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <span style={{ minWidth: 70 }}>内部揃え</span>
              <select
                value={data.textAlignHorizontal ?? 'center'}
                onChange={e => update({ textAlignHorizontal: e.target.value })}
                style={{ flex: 1, fontSize: 11 }}
              >
                <option value="left">左揃え</option>
                <option value="center">中央</option>
                <option value="right">右揃え</option>
              </select>
              <select
                value={data.textAlignVertical ?? 'middle'}
                onChange={e => update({ textAlignVertical: e.target.value })}
                style={{ flex: 1, fontSize: 11 }}
              >
                <option value="top">上寄せ</option>
                <option value="middle">中央</option>
                <option value="bottom">下寄せ</option>
              </select>
            </div>
          </div>

          {/* タイピング演出設定 */}
          <div style={{ borderTop: '1px solid #333', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={data.typingEnabled ?? true}
                onChange={e => update({ typingEnabled: e.target.checked })}
              />
              <label>1文字ずつ表示（タイピング演出）</label>
            </div>

            {data.typingEnabled && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 28, marginBottom: 8 }}>
                  <label style={{ minWidth: 100 }}>速度 (ms/文字)</label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    step={5}
                    value={data.typingSpeed ?? 50}
                    onChange={e => update({ typingSpeed: Number(e.target.value) })}
                    style={SMALL_INPUT_STYLE}
                  />
                  <span style={{ fontSize: 11, color: '#aaa' }}>
                    {data.typingSpeed <= 20 ? '（かなり速い）' : data.typingSpeed >= 80 ? '（ゆっくり）' : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 28 }}>
                  <input
                    type="checkbox"
                    checked={data.maxSpeedMode ?? false}
                    onChange={e => update({ maxSpeedMode: e.target.checked })}
                  />
                  <label>最大速度（即全文表示）</label>
                </div>
              </>
            )}
          </div>

          {/* その他の表示設定 */}
          <div style={{ borderTop: '1px solid #333', paddingTop: 12, marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ minWidth: 70 }}>文字色</span>
              <input
                type="color"
                value={data.textColor ?? defaultTextColor}
                onChange={e => update({ textColor: e.target.value })}
              />
              <span style={{ marginLeft: 'auto' }}>枠表示</span>
              <input
                type="checkbox"
                checked={data.showBox ?? true}
                onChange={e => update({ showBox: e.target.checked })}
              />
            </div>

            {data.showBox && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <span style={{ minWidth: 70 }}>背景色</span>
                <input
                  type="color"
                  value={boxBgHex}
                  onChange={e => update({ boxBackground: hexToRgba(e.target.value) })}
                />
                <span style={{ marginLeft: 'auto' }}>枠線色</span>
                <input
                  type="color"
                  value={borderHex}
                  onChange={e => update({ boxBorderColor: e.target.value })}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ minWidth: 70 }}>パディング</span>
              <input
                type="number"
                style={INPUT_STYLE}
                value={data.padding ?? defaultPadding}
                onChange={e => update({ padding: Number(e.target.value) })}
              />
              <span style={{ marginLeft: 'auto' }}>フォントサイズ</span>
              <input
                type="number"
                style={INPUT_STYLE}
                value={data.fontSize ?? defaultFontSize}
                onChange={e => update({ fontSize: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* レイヤー選択 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10 }}>
            <span style={{ minWidth: 70 }}>レイヤー</span>
            <select
              value={data.layer ?? 'text_main'}
              onChange={e => update({ layer: e.target.value })}
              style={{ flex: 1, fontSize: 11 }}
            >
              {Object.entries(cfg.layers ?? {}).map(([key, def]) => (
                <option key={key} value={key}>
                  {def.label ?? key} (z:{def.z ?? '?'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <Handle type="target" position={Position.Top} id="input" />
        <Handle type="source" position={Position.Bottom} id="output" />
      </div>
    </BaseNode>
  );
};

export default memo(LayerTextNode);