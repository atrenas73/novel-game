import { memo, useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from '../Nodes/BaseNode';

const INPUT_STYLE = {
  width: 60,
  fontSize: 11,
};

/* =========================
 * レイアウト計算（ImageStyleEditorと同じ）
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

const LayerImageNode = (props) => {
  const { data, id } = props;
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const [imageStyles, setImageStyles] = useState({});
  const [imageDimensions, setImageDimensions] = useState({ width: null, height: null });
  const [scale, setScale] = useState({ scaleX: 1, scaleY: 1 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // ★ 上流からの表示状態を保持
  const [upstreamVisible, setUpstreamVisible] = useState(true);

  // ImageStyle 読み込み
  useEffect(() => {
    const load = async () => {
      try {
        const styles = await window.electronAPI?.loadImageStyle?.();
        if (styles && typeof styles === 'object' && !Array.isArray(styles)) {
          setImageStyles(styles);
          console.log('[LayerImageNode] ImageStyles loaded:', Object.keys(styles));
        }
      } catch (err) {
        console.error('[LayerImageNode] loadImageStyle error:', err);
      }
    };
    load();
  }, []);

  const canvasW = data.editorConfig?.canvas?.width ?? 1280;
  const canvasH = data.editorConfig?.canvas?.height ?? 720;

  // ★ 上流データの監視（LayerOnOffNodeの出力を取得）
  useEffect(() => {
    // 入力エッジから上流のデータを取得
    const inputEdge = props.edges?.find(e => e.target === id && e.targetHandle === 'input');
    if (inputEdge) {
      const sourceNode = props.nodes?.find(n => n.id === inputEdge.source);
      
      if (sourceNode?.type === 'layerOnOff' && sourceNode.data?.outputLayers) {
        // LayerOnOffNodeの場合はoutputLayers配列から該当レイヤーを探す
        const myLayer = sourceNode.data.outputLayers?.find(l => l.id === data.layer);
        if (myLayer) {
          setUpstreamVisible(myLayer.visible !== false);
          console.log('[LayerImageNode] LayerOnOffNodeから表示状態受信:', { 
            layerId: data.layer, 
            visible: myLayer.visible 
          });
        }
      } else if (sourceNode?.data?.output) {
        // 他のノードからの出力
        setUpstreamVisible(sourceNode.data.output.visible !== false);
        console.log('[LayerImageNode] 上流ノードから表示状態受信:', { 
          layerId: data.layer, 
          visible: sourceNode.data.output.visible 
        });
      }
    } else {
      // 入力がない場合はデフォルトで表示
      setUpstreamVisible(true);
    }
  }, [props.edges, props.nodes, id, data.layer]);

  // 初期値補完
  useEffect(() => {
    const updates = {};
    let needsUpdate = false;

    if (!data.backgroundWidth) { updates.backgroundWidth = canvasW; needsUpdate = true; }
    if (!data.backgroundHeight) { updates.backgroundHeight = canvasH; needsUpdate = true; }
    if (!data.layer) {
      const layers = data.editorConfig?.layers ?? {};
      updates.layer = Object.keys(layers)[0] || 'bg_base';
      needsUpdate = true;
    }
    if (data.scale == null) { updates.scale = 1; needsUpdate = true; }
    if (!data.imageStyleId && Object.keys(imageStyles).length > 0) {
      updates.imageStyleId = Object.keys(imageStyles)[0];
      needsUpdate = true;
    }

    if (needsUpdate) {
      data.onChange?.(id, { ...data, ...updates });
    }
  }, [data, id, canvasW, canvasH, imageStyles]);

  // ノード本体サイズをプレビューに合わせる
  useEffect(() => {
    props.setNodes?.((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, style: { ...n.style, width: canvasW, height: canvasH + 200 } }
          : n
      )
    );
  }, [canvasW, canvasH, id, props.setNodes]);

  // 画像のサイズを取得
  useEffect(() => {
    if (!data.imageUrl) {
      setImageDimensions({ width: null, height: null });
      setIsImageLoaded(false);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const dimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight
      };
      setImageDimensions(dimensions);
      setIsImageLoaded(true);
      
      if (data.imageStyleId && imageStyles[data.imageStyleId]) {
        applyStyleAndScale(dimensions);
      }
    };
    img.onerror = () => {
      console.error('[LayerImageNode] Failed to load image:', data.imageUrl);
      setIsImageLoaded(false);
    };
    img.src = data.imageUrl;
  }, [data.imageUrl]);

  useEffect(() => {
    if (isImageLoaded && data.imageStyleId && imageStyles[data.imageStyleId]) {
      applyStyleAndScale(imageDimensions);
    }
  }, [data.imageStyleId, imageStyles, isImageLoaded]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    data.onUpload?.(id, file);
    e.target.value = '';
  }, [data, id]);

  const updateData = useCallback((updates) => {
    if (Object.keys(updates).length === 0) return;
    data.onChange?.(id, { ...data, ...updates });
  }, [data, id]);

  const applyStyleAndScale = useCallback((dimensions) => {
    if (!data.imageStyleId || !imageStyles[data.imageStyleId] || !dimensions.width) return;

    const style = imageStyles[data.imageStyleId];
    const layout = style.layout || {};
    
    const resolved = resolveLayout(layout, { width: canvasW, height: canvasH }, dimensions);
    
    const scaleResult = resolveScale({
      scaleMode: style.scaleMode || 'cover',
      imageWidth: dimensions.width,
      imageHeight: dimensions.height,
      boxWidth: resolved.width,
      boxHeight: resolved.height,
    });

    setScale(scaleResult);

    const updates = {
      displayX: resolved.x,
      displayY: resolved.y,
      displayWidth: resolved.width,
      displayHeight: resolved.height,
      opacity: style.opacity ?? 1,
      blendMode: style.blendMode ?? 'normal',
      scaleMode: style.scaleMode ?? 'cover',
      filters: style.filters || { brightness: 1, contrast: 1, saturation: 1, blur: 0 },
      box: style.box || { enabled: false, background: 'rgba(0,0,0,0.4)', borderColor: '#444', borderWidth: 0, borderRadius: 0 },
    };

    updateData(updates);
  }, [data.imageStyleId, imageStyles, canvasW, canvasH, updateData]);

  const selectedStyle = imageStyles[data.imageStyleId] || {};

  const opacity = selectedStyle.opacity ?? data.opacity ?? 1;
  const blendMode = selectedStyle.blendMode ?? data.blendMode ?? 'normal';
  const scaleMode = selectedStyle.scaleMode ?? data.scaleMode ?? 'cover';
  const filters = selectedStyle.filters || data.filters || { brightness: 1, contrast: 1, saturation: 1, blur: 0 };
  const box = selectedStyle.box || data.box || { enabled: false, background: 'rgba(0,0,0,0.4)', borderColor: '#444', borderWidth: 0, borderRadius: 0 };

  const filterStr = `brightness(${filters.brightness}) contrast(${filters.contrast}) saturate(${filters.saturation}) blur(${filters.blur}px)`;

  const resolved = data.imageStyleId && imageDimensions.width ? 
    resolveLayout(selectedStyle.layout || {}, { width: canvasW, height: canvasH }, imageDimensions) :
    { x: data.displayX || 0, y: data.displayY || 0, width: data.displayWidth || canvasW, height: data.displayHeight || canvasH };

  // ★ 出力データの生成（上流の表示状態を反映）
  const outputData = useMemo(() => {
    // 上流で非表示なら出力しない
    if (!upstreamVisible) {
      console.log('[LayerImageNode] 上流で非表示のため出力なし:', { 
        id: data.layer, 
        visible: upstreamVisible 
      });
      return null;
    }
    
    return {
      id: data.layer || 'image_main',
      type: 'image',
      layerId: data.layer,
      nodeId: id,
      imageUrl: data.imageUrl,
      imageStyleId: data.imageStyleId,
      displayX: resolved.x,
      displayY: resolved.y,
      displayWidth: resolved.width,
      displayHeight: resolved.height,
      opacity: opacity,
      blendMode: blendMode,
      scaleMode: scaleMode,
      filters: filters,
      box: box,
      zIndex: data.editorConfig?.layers?.[data.layer]?.z || 20,
      visible: upstreamVisible,  // 上流の表示状態を継承
      sourceType: 'layerImage',
      timestamp: Date.now()
    };
  }, [data, upstreamVisible, resolved, opacity, blendMode, scaleMode, filters, box]);

  // ★ dataを更新して下流に渡せるようにする
  useEffect(() => {
    if (props.data) {
      props.data.output = outputData;
      props.data._timestamp = Date.now();
      
      console.log('[LayerImageNode] 出力更新:', {
        nodeId: id,
        layerId: data.layer,
        hasOutput: !!outputData,
        visible: outputData?.visible,
        upstreamVisible
      });
    }
  }, [outputData, props.data, id, data.layer, upstreamVisible]);

  const containerStyle = {
    width: canvasW,
    height: canvasH,
    background: '#111',
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid #333',
    borderRadius: 6,
    marginBottom: 12,
    cursor: 'pointer',
  };

  const boxStyle = box.enabled ? {
    position: 'absolute',
    left: `${resolved.x}px`,
    top: `${resolved.y}px`,
    width: `${resolved.width}px`,
    height: `${resolved.height}px`,
    background: box.background,
    border: `${box.borderWidth}px solid ${box.borderColor}`,
    borderRadius: `${box.borderRadius}px`,
    pointerEvents: 'none',
    zIndex: 1,
  } : null;

  const imgContainerStyle = {
    position: 'absolute',
    left: `${resolved.x}px`,
    top: `${resolved.y}px`,
    width: `${resolved.width}px`,
    height: `${resolved.height}px`,
    overflow: 'hidden',
    boxSizing: 'border-box',
    opacity,
    mixBlendMode: blendMode,
    filter: filterStr,
    pointerEvents: 'none',
    zIndex: 2,
  };

  const imgStyle = {
    width: imageDimensions.width || '100%',
    height: imageDimensions.height || '100%',
    transform: `scale(${scale.scaleX}, ${scale.scaleY})`,
    transformOrigin: 'top left',
    display: 'block',
  };

  return (
    <BaseNode {...props}>
      <div className="nodrag" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px' }}>
        
        {/* デバッグ情報 */}
        {props.edges?.some(e => e.target === id) && (
          <div style={{
            fontSize: 9,
            background: upstreamVisible ? '#2a5' : '#a22',
            color: '#fff',
            padding: '2px 4px',
            borderRadius: 2,
            marginBottom: 4,
            width: '100%',
            textAlign: 'center'
          }}>
            上流: {upstreamVisible ? '表示' : '非表示'}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div style={{ marginBottom: 12, width: '100%' }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>プレビュー ({canvasW}×{canvasH})</span>
            {data.imageStyleId && (
              <span style={{ color: '#4af' }}>
                ✓ {selectedStyle.label || data.imageStyleId}
              </span>
            )}
          </div>
          
          <div onClick={() => fileInputRef.current?.click()} style={containerStyle}>
            {data.imageUrl ? (
              <>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  border: '2px dashed #555',
                  pointerEvents: 'none',
                  opacity: 0.5,
                }} />
                
                {boxStyle && <div style={boxStyle} />}
                
                <div style={imgContainerStyle}>
                  <img
                    ref={imageRef}
                    src={data.imageUrl}
                    alt="preview"
                    draggable={false}
                    style={imgStyle}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      const dimensions = {
                        width: img.naturalWidth,
                        height: img.naturalHeight
                      };
                      setImageDimensions(dimensions);
                      setIsImageLoaded(true);
                      
                      if (data.imageStyleId && imageStyles[data.imageStyleId]) {
                        applyStyleAndScale(dimensions);
                      }
                    }}
                  />
                </div>
                
                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: '#fff',
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 4,
                  pointerEvents: 'none',
                  zIndex: 3,
                }}>
                  ({resolved.x}, {resolved.y}) - {resolved.width}×{resolved.height}px
                  {imageDimensions.width && (
                    <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>
                      画像: {imageDimensions.width}×{imageDimensions.height}px
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ 
                color: '#666', 
                fontSize: 14, 
                textAlign: 'center', 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
                <div style={{ fontSize: 32, opacity: 0.3 }}>🖼️</div>
                <div>クリックして画像を選択</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                  {data.imageStyleId ? `スタイル: ${selectedStyle.label || data.imageStyleId}` : ''}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ width: '100%', padding: '0 8px', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ width: 60 }}>Layer</span>
                <select 
                  value={data.layer ?? ''} 
                  onChange={(e) => updateData({ layer: e.target.value })} 
                  style={{ flex: 1, fontSize: 12, padding: '6px 8px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: 4 }}
                >
                  {Object.entries(data.editorConfig?.layers ?? {}).map(([key, def]) => (
                    <option key={key} value={key}>{def.label || key}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ width: 60 }}>Style</span>
                <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                  <select 
                    value={data.imageStyleId ?? ''} 
                    onChange={(e) => updateData({ imageStyleId: e.target.value })} 
                    style={{ flex: 1, fontSize: 12, padding: '6px 8px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: 4 }}
                  >
                    <option value="">— スタイルなし —</option>
                    {Object.entries(imageStyles).map(([key, style]) => (
                      <option key={key} value={key}>{style.label || key}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Handle 
        type="target" 
        position={Position.Top} 
        id="input" 
        data-type="layer" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="output" 
        data-type="layer" 
        style={{
          background: outputData ? '#4CAF50' : '#666',
          width: '10px',
          height: '10px'
        }}
      />
    </BaseNode>
  );
};

export default memo(LayerImageNode);