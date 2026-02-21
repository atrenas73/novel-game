import React, { memo, useEffect, useCallback, useRef, useState, useMemo } from 'react';
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

/* =========================
 * レイアウト計算（TextStyleEditorと同じ）
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

const LayerTextNode = (props) => {
  const { data, isConnectable, id } = props;
  const reloadTextStyles = useReloadTextStyles();
  const textStyles = useTextStyles();
  
  // IME入力中かどうかを管理するフラグ
  const isComposing = useRef(false);
  // ローカルの入力状態（表示用）
  const [localText, setLocalText] = useState(data.text ?? '');
  // 初回レンダリングかどうかを追跡
  const isFirstRender = useRef(true);
  // 前回のdisplaySettingsを記録
  const prevDisplaySettings = useRef({});
  // ★ 上流からの表示状態を保持
  const [upstreamVisible, setUpstreamVisible] = useState(true);

  // data.textが外部（親）から変わった場合に同期
  useEffect(() => {
    if (!isComposing.current) {
      setLocalText(data.text ?? '');
    }
  }, [data.text]);

  useEffect(() => {
    reloadTextStyles();
  }, [reloadTextStyles]);

  // ★ 上流データの監視（LayerOnOffNodeの出力を取得）
  useEffect(() => {
    const inputEdge = props.edges?.find(e => e.target === id && e.targetHandle === 'input');
    if (inputEdge) {
      const sourceNode = props.nodes?.find(n => n.id === inputEdge.source);
      
      if (sourceNode?.type === 'layerOnOff' && sourceNode.data?.outputLayers) {
        const myLayer = sourceNode.data.outputLayers?.find(l => l.id === data.layer);
        if (myLayer) {
          setUpstreamVisible(myLayer.visible !== false);
          console.log('[LayerTextNode] LayerOnOffNodeから表示状態受信:', { 
            layerId: data.layer, 
            visible: myLayer.visible 
          });
        }
      } else if (sourceNode?.data?.output) {
        setUpstreamVisible(sourceNode.data.output.visible !== false);
        console.log('[LayerTextNode] 上流ノードから表示状態受信:', { 
          layerId: data.layer, 
          visible: sourceNode.data.output.visible 
        });
      }
    } else {
      setUpstreamVisible(true);
    }
  }, [props.edges, props.nodes, id, data.layer]);

  const style = textStyles?.[data.styleId];
  const isStyleSelected = !!style;
  const editorConfig = data.editorConfig;
  const layers = editorConfig?.layers || {};

  // 現在選択されているレイヤーの設定
  const currentLayerKey = data.layer || 'text_main';
  const currentLayerConfig = layers[currentLayerKey] || {};

  // テキストスタイルの位置とサイズを計算
  const displaySettings = useMemo(() => {
    if (!style || !editorConfig?.canvas) {
      return {
        displayX: currentLayerConfig.x || 0,
        displayY: currentLayerConfig.y || 0,
        displayWidth: currentLayerConfig.width || 100,
        displayHeight: currentLayerConfig.height || 100
      };
    }

    const canvas = {
      width: editorConfig.canvas.width || 1280,
      height: editorConfig.canvas.height || 720
    };

    const resolved = resolveLayout(style.layout, canvas);
    
    console.log('📐 LayerTextNode 表示設定計算:', {
      styleId: data.styleId,
      hasLayout: !!style.layout,
      canvas: canvas,
      resolved: resolved,
      layerConfig: {
        x: currentLayerConfig.x,
        y: currentLayerConfig.y,
        width: currentLayerConfig.width,
        height: currentLayerConfig.height
      }
    });

    return {
      displayX: resolved.x,
      displayY: resolved.y,
      displayWidth: resolved.width,
      displayHeight: resolved.height
    };
  }, [style, editorConfig, data.styleId, currentLayerConfig]);

  // updateをuseCallback化して安定させる
  const update = useCallback((patch) => {
    const hasChanged = Object.keys(patch).some(key => {
      if (key === '__nodeSize') {
        const current = data.__nodeSize || {};
        const next = patch.__nodeSize || {};
        return current.width !== next.width || current.height !== next.height;
      }
      return JSON.stringify(data[key]) !== JSON.stringify(patch[key]);
    });

    if (!hasChanged) {
      console.log('🔄 LayerTextNode 変更なし - 更新スキップ');
      return;
    }

    const updatedData = { ...data, ...patch };
    
    updatedData.label = updatedData.label || 'テキストレイヤー';
    updatedData.layerId = currentLayerKey;
    updatedData.zIndex = currentLayerConfig.z || 1000;
    
    if (style) {
      updatedData.textStyle = style;
    }
    
    // ★ 出力データの生成（上流の表示状態を反映）
    if (upstreamVisible) {
      updatedData.output = {
        id: currentLayerKey,
        type: 'text',
        layerId: currentLayerKey,
        nodeId: id,
        text: updatedData.text,
        characterName: updatedData.characterName,
        styleId: updatedData.styleId,
        displayX: displaySettings.displayX,
        displayY: displaySettings.displayY,
        displayWidth: displaySettings.displayWidth,
        displayHeight: displaySettings.displayHeight,
        zIndex: currentLayerConfig.z || 1000,
        visible: upstreamVisible,
        sourceType: 'layerText',
        timestamp: Date.now()
      };
    } else {
      updatedData.output = null;
    }
    
    console.log('📤 LayerTextNode 出力データ更新:', {
      nodeId: id,
      layerId: updatedData.layerId,
      styleId: updatedData.styleId,
      text: updatedData.text?.substring(0, 20),
      visible: upstreamVisible,
      displaySettings
    });
    
    data.onChange?.(id, updatedData);
  }, [id, data, currentLayerKey, currentLayerConfig, style, displaySettings, upstreamVisible]);

  // 初回レンダリング時またはdisplaySettingsが変わった場合のみupdateを呼び出す
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (style && Object.keys(displaySettings).length > 0) {
        console.log('🎯 LayerTextNode 初回レンダリング - 表示設定を更新:', displaySettings);
        update(displaySettings);
      }
      return;
    }

    const settingsChanged = 
      prevDisplaySettings.current.displayX !== displaySettings.displayX ||
      prevDisplaySettings.current.displayY !== displaySettings.displayY ||
      prevDisplaySettings.current.displayWidth !== displaySettings.displayWidth ||
      prevDisplaySettings.current.displayHeight !== displaySettings.displayHeight;

    if (settingsChanged && style) {
      console.log('🎯 LayerTextNode 表示設定が変わったので更新:', {
        previous: prevDisplaySettings.current,
        current: displaySettings
      });
      
      const needsUpdate = 
        data.displayX !== displaySettings.displayX ||
        data.displayY !== displaySettings.displayY ||
        data.displayWidth !== displaySettings.displayWidth ||
        data.displayHeight !== displaySettings.displayHeight;

      if (needsUpdate) {
        update(displaySettings);
      }
      
      prevDisplaySettings.current = { ...displaySettings };
    }
  }, [displaySettings, style, update, data]);

  /* =====================================================
   * TextStyle 選択時にノードサイズを同期
   * ===================================================== */
  useEffect(() => {
    if (!style || !editorConfig) return;
    
    const { width, height } = resolveTextAreaSize(style, editorConfig);
    const targetW = width;
    const targetH = (height ?? 120) + 80;

    const nodeSizeChanged = 
      data.__nodeSize?.width !== targetW || 
      data.__nodeSize?.height !== targetH;

    if (nodeSizeChanged) {
      console.log('📏 LayerTextNode ノードサイズ更新:', {
        from: data.__nodeSize,
        to: { width: targetW, height: targetH }
      });
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
    update({ text: e.currentTarget.value });
  };
  const onChangeText = (e) => {
    const nextValue = e.target.value;
    setLocalText(nextValue);
    if (!isComposing.current) {
      update({ text: nextValue });
    }
  };

  // レイヤーが変更されたときの処理
  const onChangeLayer = (e) => {
    const newLayer = e.target.value;
    const newLayerConfig = layers[newLayer] || {};
    
    const patch = {
      layer: newLayer,
      layerId: newLayer,
      zIndex: newLayerConfig.z || 1000
    };
    
    update(patch);
  };

  // スタイルが変更されたときの処理
  const onChangeStyle = (e) => {
    const newStyleId = e.target.value;
    const newStyle = textStyles[newStyleId];
    
    if (newStyle) {
      const patch = {
        styleId: newStyleId,
        textStyle: newStyle
      };
      
      console.log('🔄 LayerTextNode スタイル変更:', {
        styleId: newStyleId,
        hasStyle: !!newStyle
      });
      
      update(patch);
    } else {
      update({ styleId: newStyleId, textStyle: null });
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
        {/* デバッグ情報表示 */}
        {props.edges?.some(e => e.target === id) && (
          <div style={{
            fontSize: 9,
            background: upstreamVisible ? '#2a5' : '#a22',
            color: '#fff',
            padding: '2px 4px',
            marginBottom: '2px',
            borderRadius: '2px',
            textAlign: 'center'
          }}>
            上流: {upstreamVisible ? '表示' : '非表示'}
          </div>
        )}

        {process.env.NODE_ENV === 'development' && (
          <div style={{
            fontSize: 9,
            background: '#2a2a2a',
            color: '#888',
            padding: '2px 4px',
            marginBottom: '2px',
            borderRadius: '2px'
          }}>
            表示: ({displaySettings.displayX}, {displaySettings.displayY}) {displaySettings.displayWidth}×{displaySettings.displayHeight}
          </div>
        )}

        <select
          value={data.styleId ?? ''}
          onChange={onChangeStyle}
          style={{ width: '100%', fontSize: 11, marginBottom: 4 }}
        >
          <option value="" disabled>テキストスタイルを選択</option>
          {Object.entries(textStyles || {}).map(([key, s]) => (
            <option key={key} value={key}>{s.label ?? key}</option>
          ))}
        </select>

        <select
          value={data.layer ?? 'text_main'}
          onChange={onChangeLayer}
          style={{ width: '100%', fontSize: 11, marginBottom: 4 }}
        >
          <option value="" disabled>レイヤーを選択</option>
          {Object.entries(layers).map(([key, layer]) => (
            <option key={key} value={key}>{layer.label} ({key})</option>
          ))}
        </select>

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

      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable}
        id="input"
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable}
        id="output"
        style={{
          background: upstreamVisible ? '#4CAF50' : '#666',
          width: '10px',
          height: '10px'
        }}
      />
    </BaseNode>
  );
};

export default memo(LayerTextNode);