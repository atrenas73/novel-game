import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from '../Nodes/BaseNode';

const LayerTimelineNode = (props) => {
  const { data, isConnectable } = props;
  const frames = data.frames || [];

  const [intervalMs, setIntervalMs] = useState(data.intervalMs || 800);
  const [currentIndex, setCurrentIndex] = useState(0);
  const canvasRef = useRef(null);

  /* ===============================
     index 安全処理
     =============================== */
  useEffect(() => {
    if (frames.length === 0) {
      setCurrentIndex(0);
      return;
    }
    if (currentIndex >= frames.length) {
      setCurrentIndex(0);
    }
  }, [frames, currentIndex]);

  /* ===============================
     スライドショー
     =============================== */
  useEffect(() => {
    if (frames.length < 2) return;

    const timer = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % frames.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [frames.length, intervalMs]);

  /* ===============================
     ★完全合成（ImageStyle対応強化版）★
     =============================== */
  useEffect(() => {
    const frame = frames[currentIndex];
    if (!frame || !canvasRef.current) return;

    const viewCanvas = canvasRef.current;
    const viewCtx = viewCanvas.getContext('2d');

    const w = frame.backgroundWidth ?? 1280;
    const h = frame.backgroundHeight ?? 720;

    viewCanvas.width = w;
    viewCanvas.height = h;

    // オフスクリーン canvas で合成
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d');

    offCtx.clearRect(0, 0, w, h);

    const layers = (frame.layers || []).slice().sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    let loadedCount = 0;
    const totalLayers = layers.length;

    if (totalLayers === 0) {
      viewCtx.clearRect(0, 0, w, h);
      return;
    }

    layers.forEach((layer) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // 必要に応じて
      img.src = layer.imageUrl;

      img.onload = () => {
        offCtx.save();

        // 1. 位置・スケール適用
        offCtx.translate(layer.x ?? 0, layer.y ?? 0);
        offCtx.scale(layer.scale ?? 1, layer.scale ?? 1);

        // 2. ImageStyle 適用
        const style = layer.imageStyle || {}; // LayerImageNode で imageStyleId から展開済みと仮定
        const {
          opacity = 1,
          blendMode = 'normal',
          scaleMode = 'contain',
          filters = { brightness: 1, contrast: 1, saturation: 1, blur: 0 },
          box = { enabled: false, background: 'rgba(0,0,0,0.4)', borderColor: '#444', borderWidth: 0, borderRadius: 0 },
        } = style;

        // box（背景＋枠）を先に描画
        if (box.enabled) {
          const bw = layer.displayWidth ?? img.width;
          const bh = layer.displayHeight ?? img.height;

          offCtx.fillStyle = box.background;
          offCtx.fillRect(0, 0, bw, bh);

          if (box.borderWidth > 0) {
            offCtx.strokeStyle = box.borderColor;
            offCtx.lineWidth = box.borderWidth;
            offCtx.strokeRect(0, 0, bw, bh);
          }
        }

        // 画像描画前のスタイル適用
        offCtx.globalAlpha = opacity;
        offCtx.globalCompositeOperation = blendMode;

        // filter（canvas の filter プロパティを使用）
        const filterStr = [
          `brightness(${filters.brightness})`,
          `contrast(${filters.contrast})`,
          `saturate(${filters.saturation})`,
          `blur(${filters.blur}px)`,
        ].join(' ');
        offCtx.filter = filterStr;

        // scaleMode 簡易対応（contain / cover / fill）
        let drawX = 0;
        let drawY = 0;
        let drawW = img.width;
        let drawH = img.height;

        const targetW = layer.displayWidth ?? img.width;
        const targetH = layer.displayHeight ?? img.height;

        if (scaleMode === 'contain') {
          const ratio = Math.min(targetW / img.width, targetH / img.height);
          drawW = img.width * ratio;
          drawH = img.height * ratio;
          drawX = (targetW - drawW) / 2;
          drawY = (targetH - drawH) / 2;
        } else if (scaleMode === 'cover') {
          const ratio = Math.max(targetW / img.width, targetH / img.height);
          drawW = img.width * ratio;
          drawH = img.height * ratio;
          drawX = (targetW - drawW) / 2;
          drawY = (targetH - drawH) / 2;
        } else if (scaleMode === 'fill') {
          drawW = targetW;
          drawH = targetH;
        } // else 'none' などは元サイズのまま

        offCtx.drawImage(img, drawX, drawY, drawW, drawH);

        offCtx.restore();

        loadedCount++;
        if (loadedCount === totalLayers) {
          viewCtx.clearRect(0, 0, w, h);
          viewCtx.drawImage(offCanvas, 0, 0);
        }
      };

      img.onerror = () => {
        loadedCount++;
        console.warn(`画像読み込み失敗: ${layer.imageUrl}`);
        if (loadedCount === totalLayers) {
          viewCtx.clearRect(0, 0, w, h);
          viewCtx.drawImage(offCanvas, 0, 0);
        }
      };
    });
  }, [frames, currentIndex]);

  const handleDotClick = useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  return (
    <BaseNode {...props}>
      <Handle
        id="input"
        type="target"
        position={Position.Top}
        data-type="layer"
        isConnectable={isConnectable}
      />

      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#111',
        }}
      >
        <div
          style={{
            flex: 1,
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {frames.length === 0 ? (
            <div style={{ color: '#888', fontSize: 14 }}>
              LayerImageNode を接続してください
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              style={{ maxWidth: '100%', maxHeight: '100%', imageRendering: 'pixelated' }}
            />
          )}
        </div>

        {frames.length > 1 && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                padding: 10,
                background: '#222',
              }}
            >
              {frames.map((_, i) => (
                <div
                  key={i}
                  onClick={() => handleDotClick(i)}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: i === currentIndex ? '#4fc' : '#666',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>

            <div
              style={{
                textAlign: 'center',
                padding: '6px 8px',
                fontSize: 12,
                color: '#ccc',
                borderTop: '1px solid #444',
              }}
            >
              {currentIndex + 1} / {frames.length}
            </div>
          </>
        )}

        {frames.length > 1 && (
          <div
            style={{
              padding: '8px 10px',
              background: '#1a1a1a',
              borderTop: '1px solid #444',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 12,
                color: '#aaa',
              }}
            >
              <span>速度</span>
              <input
                type="range"
                min="100"
                max="2000"
                step="50"
                value={intervalMs}
                onChange={(e) => setIntervalMs(Number(e.target.value))}
                style={{ flex: 1 }}
                className="nodrag"
              />
              <span style={{ minWidth: 60, textAlign: 'right' }}>
                {intervalMs}ms
              </span>
            </div>
          </div>
        )}
      </div>

      <Handle id="output" type="source" position={Position.Bottom} />
    </BaseNode>
  );
};

export default memo(LayerTimelineNode);