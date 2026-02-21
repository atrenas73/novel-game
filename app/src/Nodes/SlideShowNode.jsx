import { memo, useEffect, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from '../Nodes/BaseNode';

const SlideShowNode = (props) => {
  const { data, id, isConnectable } = props;
  const images = data.images || [];

  // 切り替え間隔
  const [intervalMs, setIntervalMs] = useState(data.transitionInterval || 5000);
  useEffect(() => {
    if (data.transitionInterval !== undefined) {
      setIntervalMs(data.transitionInterval);
    }
  }, [data.transitionInterval]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // ★ images 更新時に index を必ず安全な範囲に戻す（ワークフロー読込対策）
  useEffect(() => {
    if (images.length === 0) {
      setCurrentIndex(0);
      return;
    }
    if (currentIndex >= images.length) {
      setCurrentIndex(0);
    }
  }, [images, currentIndex]);

  // スライドショー処理
  useEffect(() => {
    if (images.length < 2) {
      setCurrentIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  const handleIntervalChange = useCallback(
    (e) => {
      const val = Number(e.target.value);
      setIntervalMs(val);
      if (data.onTransitionChange) {
        data.onTransitionChange(id, val);
      }
    },
    [data, id]
  );

  const handleDotClick = useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  const currentImage = images[currentIndex];

  return (
    <BaseNode {...props}>
      {/* 入力ハンドルは1つだけ */}
      <Handle
        id="input"
        type="target"
        position={Position.Top}
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
        {/* 画像表示 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            position: 'relative',
          }}
        >
          {images.length === 0 ? (
            <div style={{ color: '#888', fontSize: '14px', textAlign: 'center' }}>
              画像ノードを<br />
              接続してください
            </div>
          ) : (
            <>
              {/* ★ imageUrl が存在する時だけ描画（空文字・undefined防止） */}
              {currentImage?.imageUrl && (
                <img
                  src={currentImage.imageUrl}
                  alt={currentImage.fileName || 'slide'}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                  className="nodrag"
                />
              )}

              {currentImage?.fileName && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    padding: '8px',
                    fontSize: '12px',
                    textAlign: 'center',
                  }}
                >
                  {currentImage.fileName}
                </div>
              )}
            </>
          )}
        </div>

        {/* ドットナビ */}
        {images.length > 1 && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                background: '#222',
              }}
            >
              {images.map((_, i) => (
                <div
                  key={i}
                  onClick={() => handleDotClick(i)}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: i === currentIndex ? '#fff' : '#666',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <div
              style={{
                textAlign: 'center',
                padding: '6px 8px',
                fontSize: '12px',
                color: '#ccc',
                borderTop: '1px solid #444',
              }}
            >
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}

        {/* 再生速度 */}
        {images.length > 1 && (
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
                gap: '10px',
                fontSize: '12px',
                color: '#aaa',
              }}
            >
              <span>速度</span>
              <input
                type="range"
                min="1000"
                max="10000"
                step="500"
                value={intervalMs}
                onChange={handleIntervalChange}
                style={{ flex: 1 }}
                className="nodrag"
              />
              <span style={{ minWidth: '50px', textAlign: 'right' }}>
                {(intervalMs / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
};

export default memo(SlideShowNode);
