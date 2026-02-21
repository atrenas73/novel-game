import { memo, useEffect, useCallback, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from '../Nodes/BaseNode';
import { useTextStyles, useReloadTextStyles } from '../contexts/TextStyleContext';
import { textStyleToInputCSS } from '../utils/textStyleToInputCSS';

function resolveTextAreaSize(style, editorConfig) {
  const canvasW = editorConfig?.canvas?.width ?? 1280;
  const canvasH = editorConfig?.canvas?.height ?? 720;
  const layout = style?.layout ?? {};

  const width = layout.width ?? (layout.widthRatio != null ? canvasW * layout.widthRatio : canvasW * 0.95);
  const height = layout.height ?? (layout.heightRatio != null ? canvasH * layout.heightRatio : undefined);

  return {
    width: Math.round(width),
    height: height ? Math.round(height) : undefined,
  };
}

const TextNode = (props) => {
  const { data, isConnectable, id } = props;
  const reloadTextStyles = useReloadTextStyles();
  const textStyles = useTextStyles();
  
  // IME入力中かどうかを管理するフラグ
  const isComposing = useRef(false);
  // ローカルの入力状態（表示用）
  const [localText, setLocalText] = useState(data.text ?? '');

  // data.textが外部（親）から変わった場合に同期
  useEffect(() => {
    if (!isComposing.current) {
      setLocalText(data.text ?? '');
    }
  }, [data.text]);

  useEffect(() => {
    reloadTextStyles();
  }, [reloadTextStyles]);

  const style = textStyles?.[data.styleId];
  const isStyleSelected = !!style;
  const editorConfig = data.editorConfig;
  const layers = editorConfig?.layers || {};

  // updateをuseCallback化して安定させる
  const update = useCallback((patch) => {
    data.onChange?.(id, { ...data, ...patch });
  }, [id, data]);

  /* =====================================================
   * TextStyle 選択時にノードサイズを同期
   * ===================================================== */
  useEffect(() => {
    if (!style || !editorConfig) return;
    const { width, height } = resolveTextAreaSize(style, editorConfig);
    const targetW = width;
    const targetH = (height ?? 120) + 80;

    // 現在のサイズと違う場合のみ更新（無限ループ防止）
    if (data.__nodeSize?.width !== targetW || data.__nodeSize?.height !== targetH) {
      update({
        __nodeSize: { width: targetW, height: targetH },
      });
    }
  }, [style, editorConfig, data.__nodeSize, update]);

  const { width, height } = style ? resolveTextAreaSize(style, editorConfig) : {};

  // ハンドラー
  const onCompositionStart = () => { isComposing.current = true; };
  const onCompositionEnd = (e) => {
    isComposing.current = false;
    // 確定時の値を親に反映
    update({ text: e.currentTarget.value });
  };
  const onChangeText = (e) => {
    const nextValue = e.target.value;
    setLocalText(nextValue); // 見た目を即座に更新
    if (!isComposing.current) {
      update({ text: nextValue }); // 変換中じゃなければ親へ
    }
  };

  return (
    <BaseNode
      {...props}
      style={{
        width: data.__nodeSize?.width,
        height: data.__nodeSize?.height,
      }}
    >
      <div
        className="text-node-content nodrag"
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Style 選択 */}
        <select
          value={data.styleId ?? ''}
          onChange={(e) => update({ styleId: e.target.value, text: '' })}
          style={{ width: '100%', fontSize: 11, marginBottom: 4 }}
        >
          <option value="" disabled>テキストスタイルを選択</option>
          {Object.entries(textStyles || {}).map(([key, s]) => (
            <option key={key} value={key}>{s.label ?? key}</option>
          ))}
        </select>

        {/* レイヤー選択 */}
        <select
          value={data.layer ?? 'text_main'}
          onChange={(e) => update({ layer: e.target.value })}
          style={{ width: '100%', fontSize: 11, marginBottom: 4 }}
        >
          <option value="" disabled>レイヤーを選択</option>
          {Object.entries(layers).map(([key, layer]) => (
            <option key={key} value={key}>{layer.label} ({key})</option>
          ))}
        </select>

        {/* テキスト入力 */}
        <textarea
          disabled={!isStyleSelected}
          value={localText}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          onChange={onChangeText}
          rows={style?.maxLines ?? 4}
          placeholder={isStyleSelected ? '' : '先にテキストスタイルを選択してください'}
          style={{
            width,
            height,
            maxWidth: '100%',
            boxSizing: 'border-box',
            resize: 'none',
            outline: 'none',
            opacity: isStyleSelected ? 1 : 0.5,
            background: '#000',
            ...textStyleToInputCSS(style),
          }}
        />
      </div>

      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </BaseNode>
  );
};

export default memo(TextNode);