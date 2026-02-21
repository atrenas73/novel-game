import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from '../Nodes/BaseNode';
import { useImageStyles } from '../contexts/ImageStyleContext';

/* ===============================
 * util: image loader with cache
 * =============================== */
const imageCache = new Map();

const loadImage = (src) => {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src));
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
};

/* ===============================
 * util: layout 解決
 * =============================== */
function resolveLayout(layout = {}, canvas, image) {
  const {
    x = null,
    y = null,
    width = null,
    height = null,
    widthRatio = 1,
    heightRatio = 1,
    positionPreset = 'center',
  } = layout;

  const baseW = image.width;
  const baseH = image.height;

  const w = width ?? Math.round(baseW * widthRatio);
  const h = height ?? Math.round(baseH * heightRatio);

  let rx = x;
  let ry = y;

  if (x === null || y === null) {
    switch (positionPreset) {
      case 'top_left':
        rx = 0; ry = 0; break;
      case 'top_center':
        rx = (canvas.width - w) / 2; ry = 0; break;
      case 'top_right':
        rx = canvas.width - w; ry = 0; break;
      case 'left':
        rx = 0; ry = (canvas.height - h) / 2; break;
      case 'center':
        rx = (canvas.width - w) / 2;
        ry = (canvas.height - h) / 2; break;
      case 'right':
        rx = canvas.width - w;
        ry = (canvas.height - h) / 2; break;
      case 'bottom_left':
        rx = 0; ry = canvas.height - h; break;
      case 'bottom_center':
        rx = (canvas.width - w) / 2; ry = canvas.height - h; break;
      case 'bottom_right':
        rx = canvas.width - w; ry = canvas.height - h; break;
      default:
        rx = (canvas.width - w) / 2;
        ry = (canvas.height - h) / 2;
    }
  }

  rx = Math.max(0, Math.min(rx, canvas.width - w));
  ry = Math.max(0, Math.min(ry, canvas.height - h));

  return {
    x: Math.round(rx),
    y: Math.round(ry),
    width: Math.round(w),
    height: Math.round(h),
  };
}

/* ===============================
 * Component - フレーム0を無視した正しいスライドショー
 * =============================== */
const LayerTimelineNode = (props) => {
  const { data, isConnectable } = props;
  
  // ★★★ データのデバッグ ★★★
  console.log('🎯 LayerTimelineNode データ受信:', {
    id: props.id,
    dataType: typeof data,
    hasData: !!data,
    dataKeys: Object.keys(data || {}),
    framesCount: data?.frames?.length || 0,
    framesData: data?.frames || []
  });

  const frames = data?.frames || [];

  const imageStyles = useImageStyles();

  const [intervalMs, setIntervalMs] = useState(data?.intervalMs || 800);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [debugInfo, setDebugInfo] = useState('');

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const drawTokenRef = useRef(0);

  // ★★★ フレーム0をスキップした表示用フレーム配列 ★★★
  const displayFrames = frames.slice(1); // フレーム0を除外

  // ★★★ データの整合性チェック ★★★
  useEffect(() => {
    const info = [];
    
    info.push(`📊 ノードID: ${props.id}`);
    info.push(`📦 受信フレーム数: ${frames.length}`);
    
    frames.forEach((frame, idx) => {
      info.push(`  📍 フレーム${idx}: ${frame?.layers?.length || 0}レイヤー`);
      if (frame?.layers) {
        frame.layers.forEach((layer, lidx) => {
          info.push(`    🎨 レイヤー${lidx}: ${layer.id} (${layer.imageUrl ? '画像あり' : '画像なし'})`);
        });
      }
    });
    
    info.push(`🚀 表示フレーム数: ${displayFrames.length}`);
    
    setDebugInfo(info.join('\n'));
    
    // デバッグログ
    console.log('🔍 フレームデータ詳細:');
    frames.forEach((frame, idx) => {
      console.log(`  フレーム${idx}:`, {
        id: frame?.id,
        layerCount: frame?.layers?.length,
        layers: frame?.layers?.map(l => ({ id: l.id, imageUrl: l.imageUrl?.slice(0, 50) }))
      });
    });

  }, [frames, props.id]);

  /* コンテナサイズの監視 */
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  /* index 安全処理 */
  useEffect(() => {
    if (displayFrames.length === 0) {
      setCurrentSlideIndex(0);
      return;
    }
    if (currentSlideIndex >= displayFrames.length) {
      setCurrentSlideIndex(0);
    }
  }, [displayFrames, currentSlideIndex]);

  /* slideshow - フレーム1とフレーム2だけで */
  useEffect(() => {
    if (displayFrames.length < 2) return;
    
    const t = setInterval(() => {
      setCurrentSlideIndex((i) => (i + 1) % displayFrames.length);
    }, intervalMs);
    
    return () => clearInterval(t);
  }, [displayFrames.length, intervalMs]);

  /* ===============================
   * canvas composite - フレーム0を無視して描画
   * =============================== */
  useEffect(() => {
    const frame = displayFrames[currentSlideIndex];
    const canvas = canvasRef.current;
    
    if (!frame || !canvas) {
      console.log('🎬 描画スキップ: フレームまたはキャンバスがありません');
      return;
    }

    const ctx = canvas.getContext('2d');
    const token = ++drawTokenRef.current;

    const cw = frame.backgroundWidth || 1280;
    const ch = frame.backgroundHeight || 720;

    canvas.width = cw;
    canvas.height = ch;

    // クリア
    ctx.clearRect(0, 0, cw, ch);

    // 背景 - スライドごとに色を変える
    const bgColors = ['#001122', '#112200', '#220011'];
    ctx.fillStyle = bgColors[currentSlideIndex % bgColors.length] || '#000';
    ctx.fillRect(0, 0, cw, ch);

    // フレーム内の全レイヤーを取得
    const allLayers = [];
    
    if (frame.layers && Array.isArray(frame.layers)) {
      console.log(`🎬 このフレームのレイヤー数: ${frame.layers.length}`);
      
      frame.layers.forEach((layer, idx) => {
        if (layer && layer.imageUrl) {
          allLayers.push({
            id: layer.id || `layer_${idx}`,
            imageUrl: layer.imageUrl,
            imageStyleId: layer.imageStyleId,
            layer: layer.layer || layer.id,
            zIndex: layer.zIndex || idx * 10,
            x: layer.x || 0,
            y: layer.y || 0,
            scale: layer.scale || 1
          });
        }
      });
    }

    console.log(`🎬 収集したレイヤー数: ${allLayers.length}`);

    if (allLayers.length === 0) {
      console.log('🎬 描画するレイヤーがありません');
      setIsLoading(false);
      
      // エラーメッセージを表示
      ctx.fillStyle = '#f00';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('レイヤーデータがありません', 20, 40);
      return;
    }

    // z-index順にソート
    allLayers.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    setIsLoading(true);

    // 描画関数
    const drawComposite = async () => {
      if (drawTokenRef.current !== token) {
        console.log('🎬 トークン不一致、描画中止');
        return;
      }

      try {
        // 1. すべての画像を読み込む
        const loadedLayers = [];
        for (const layer of allLayers) {
          if (drawTokenRef.current !== token) return;
          
          try {
            const img = await loadImage(layer.imageUrl);
            loadedLayers.push({ ...layer, img });
          } catch (err) {
            console.warn(`❌ 読み込み失敗: ${layer.id}`, err);
          }
        }

        if (drawTokenRef.current !== token) return;

        // 2. 描画前にクリア
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = bgColors[currentSlideIndex % bgColors.length] || '#000';
        ctx.fillRect(0, 0, cw, ch);

        console.log(`🎨 ${loadedLayers.length}個のレイヤーを描画開始...`);

        // 3. レイヤーを順番に描画
        for (const layerData of loadedLayers) {
          if (drawTokenRef.current !== token) return;

          const { id, img, x, y, scale } = layerData;
          
          // スタイル取得
          let style = {};
          if (imageStyles) {
            if (imageStyles[id]) {
              style = imageStyles[id];
            } else if (id.includes('bg') && imageStyles.Background_Base) {
              style = imageStyles.Background_Base;
            } else if (id.includes('Character') && imageStyles.Character_Front) {
              style = imageStyles.Character_Front;
            }
          }

          // レイアウト
          const layout = style.layout || {};
          const rect = resolveLayout(layout, { width: cw, height: ch }, img);

          // 描画設定
          ctx.globalAlpha = style.opacity ?? 1;
          ctx.globalCompositeOperation = style.blendMode || 'source-over';

          // スケール計算
          const scaleMode = style.scaleMode || 'fill';
          let sx = 1, sy = 1, dx = rect.x + (x || 0), dy = rect.y + (y || 0);

          if (scaleMode === 'cover') {
            const scaleValue = Math.max(rect.width / img.width, rect.height / img.height) * (scale || 1);
            sx = sy = scaleValue;
            dx = rect.x + (x || 0) + (rect.width - img.width * scaleValue) / 2;
            dy = rect.y + (y || 0) + (rect.height - img.height * scaleValue) / 2;
          } else if (scaleMode === 'contain') {
            const scaleValue = Math.min(rect.width / img.width, rect.height / img.height) * (scale || 1);
            sx = sy = scaleValue;
            dx = rect.x + (x || 0) + (rect.width - img.width * scaleValue) / 2;
            dy = rect.y + (y || 0) + (rect.height - img.height * scaleValue) / 2;
          } else if (scaleMode === 'fill') {
            sx = (rect.width / img.width) * (scale || 1);
            sy = (rect.height / img.height) * (scale || 1);
          }

          // 描画
          ctx.drawImage(
            img,
            0, 0, img.width, img.height,
            dx, dy, img.width * sx, img.height * sy
          );

          // 設定をリセット
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }

        // 4. スライド情報を表示
        ctx.fillStyle = '#0ff';
        ctx.font = 'bold 28px Arial';
        ctx.fillText(`スライド ${currentSlideIndex + 1}`, 20, 40);
        ctx.font = '18px Arial';
        ctx.fillText(`レイヤー数: ${loadedLayers.length}`, 20, 70);
        ctx.fillText(`ノードID: ${props.id}`, 20, 95);

        console.log(`🎬 スライド ${currentSlideIndex + 1} 描画完了`);
        setIsLoading(false);

      } catch (error) {
        console.error('🎬 描画エラー:', error);
        setIsLoading(false);
      }
    };

    drawComposite();

  }, [displayFrames, currentSlideIndex, imageStyles, props.id]);

  const handleDotClick = useCallback((i) => {
    setCurrentSlideIndex(i);
  }, []);

  // ★★★ フレーム情報を表示 ★★★
  const frameInfo = displayFrames.length > 0 ? 
    `表示中: フレーム${frames.indexOf(displayFrames[currentSlideIndex])} (スライド${currentSlideIndex + 1}/${displayFrames.length})` :
    'フレーム1とフレーム2を待機中...';

  return (
    <BaseNode {...props}>
      <Handle
        id="input"
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />

      <div style={{ 
        width: '100%', 
        height: '100%', 
        background: '#111',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* ヘッダー */}
        <div style={{ 
          padding: '8px 12px',
          background: '#1a1a1a',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: 12, color: '#ccc' }}>
            🎬 レイヤースライドショー (フレーム0を除外)
          </div>
          <div style={{ 
            fontSize: 11, 
            color: '#8af'
          }}>
            {frameInfo}
          </div>
          <div style={{ 
            fontSize: 10, 
            color: '#f8f',
            marginLeft: 10
          }}>
            ノード: {props.id?.slice(-4)}
          </div>
        </div>

        {/* キャンバスコンテナ */}
        <div 
          ref={containerRef}
          style={{
            flex: 1,
            background: '#000',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 0,
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {displayFrames.length === 0 ? (
            <div style={{ 
              color: '#888', 
              padding: 20,
              textAlign: 'center',
              fontSize: 14,
              whiteSpace: 'pre-line'
            }}>
              フレーム1とフレーム2を接続してください
              <div style={{ fontSize: 12, marginTop: 8, color: '#666' }}>
                現在の全フレーム数: {frames.length}
              </div>
              
              {/* デバッグ情報表示 */}
              {debugInfo && (
                <div style={{
                  marginTop: 16,
                  padding: 10,
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 4,
                  fontSize: 10,
                  color: '#8cf',
                  textAlign: 'left',
                  maxHeight: 150,
                  overflow: 'auto',
                  whiteSpace: 'pre-line',
                  fontFamily: 'monospace'
                }}>
                  📋 デバッグ情報:
                  {debugInfo}
                </div>
              )}
            </div>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                style={{ 
                  objectFit: 'contain',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  background: '#111',
                  width: '100%',
                  height: '100%'
                }}
              />
              {isLoading && (
                <div style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: 'rgba(0,0,0,0.7)',
                  color: '#4fc',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 12
                }}>
                  読み込み中...
                </div>
              )}
            </>
          )}
        </div>

        {/* コントロール */}
        <div style={{ 
          padding: '12px',
          background: '#1a1a1a',
          borderTop: '1px solid #333'
        }}>
          {/* スライドナビゲーション */}
          {displayFrames.length > 1 && (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 0',
                  flexWrap: 'wrap'
                }}
              >
                {displayFrames.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => handleDotClick(i)}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: i === currentSlideIndex ? '#4fc' : '#666',
                      cursor: 'pointer',
                      border: i === currentSlideIndex ? '2px solid #fff' : 'none'
                    }}
                    title={`スライド ${i + 1} (フレーム${frames.indexOf(displayFrames[i])})`}
                  />
                ))}
              </div>

              {/* スピードコントロール */}
              <div style={{ 
                padding: '8px 0', 
                fontSize: 12, 
                color: '#aaa',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <span>速度:</span>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={intervalMs}
                  onChange={(e) => setIntervalMs(Number(e.target.value))}
                  className="nodrag"
                  style={{ flex: 1 }}
                />
                <span style={{ 
                  minWidth: 60,
                  textAlign: 'right',
                  color: '#4af'
                }}>
                  {intervalMs}ms
                </span>
              </div>
            </>
          )}

          {/* フレーム情報 */}
          <div style={{ 
            fontSize: 10, 
            color: '#8af',
            paddingTop: 8,
            borderTop: '1px solid #333',
            marginTop: 8,
            whiteSpace: 'pre-line',
            fontFamily: 'monospace',
            maxHeight: 100,
            overflow: 'auto'
          }}>
            <div style={{ color: '#4fc', marginBottom: 4 }}>📊 フレーム情報:</div>
            <div>・ノードID: {props.id}</div>
            <div>・全フレーム: {frames.length}個 (フレーム0を除外)</div>
            <div>・表示フレーム: {displayFrames.length}個</div>
            {displayFrames[currentSlideIndex] && (
              <div>・現在のレイヤー数: {displayFrames[currentSlideIndex].layers?.length || 0}</div>
            )}
            
            {/* 詳細デバッグ情報 */}
            {displayFrames.length > 0 && displayFrames[currentSlideIndex] && (
              <>
                <div style={{ marginTop: 4, color: '#f8f' }}>
                  ・現在のフレームID: {displayFrames[currentSlideIndex].id}
                </div>
                {displayFrames[currentSlideIndex].layers && (
                  <div>
                    ・レイヤー詳細:
                    {displayFrames[currentSlideIndex].layers.map((layer, idx) => (
                      <div key={idx} style={{ marginLeft: 10, fontSize: 9 }}>
                        {layer.id} - {layer.imageUrl ? '✅' : '❌'}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Handle id="output" type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </BaseNode>
  );
};

export default memo(LayerTimelineNode);