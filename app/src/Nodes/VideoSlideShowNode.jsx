// VideoSlideShowNode.jsx
import { memo, useEffect, useRef, useState, useCallback } from 'react';
import BaseNode from '../Nodes/BaseNode';

// =======================================================
// VideoSlideShowNode
// =======================================================
const VideoSlideShowNode = (props) => {
  const { data, id } = props;

  // チェーンから渡される動画配列
  const videos = data.videos || []; // [{ videoUrl, fileName }]

  // -------------------------------------------------------
  // state 定義
  // -------------------------------------------------------
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 再生スピード
  const [playbackRate, setPlaybackRate] = useState(
    data.playbackRate ?? 1.0
  );

  // ★ 音量（0.0 ～ 1.0）
  const [volume, setVolume] = useState(
    data.volume ?? 1.0
  );

  const videoRef = useRef(null);

  // -------------------------------------------------------
  // 外部データ同期（App.jsx → Node）
  // -------------------------------------------------------
  useEffect(() => {
    if (data.playbackRate !== undefined) {
      setPlaybackRate(data.playbackRate);
    }
  }, [data.playbackRate]);

  useEffect(() => {
    if (data.volume !== undefined) {
      setVolume(data.volume);
    }
  }, [data.volume]);

  // -------------------------------------------------------
  // 動画終了時に次へ
  // -------------------------------------------------------
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleEnded = () => {
      if (videos.length > 1) {
        setCurrentIndex((prev) => (prev + 1) % videos.length);
      }
    };

    videoEl.addEventListener('ended', handleEnded);
    return () => videoEl.removeEventListener('ended', handleEnded);
  }, [videos.length]);

  // -------------------------------------------------------
  // 再生 / 一時停止
  // -------------------------------------------------------
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isPlaying) {
      videoEl.play().catch(() => {});
    } else {
      videoEl.pause();
    }
  }, [isPlaying, currentIndex]);

  // -------------------------------------------------------
  // 再生スピード適用
  // -------------------------------------------------------
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, currentIndex]);

  // -------------------------------------------------------
  // 音量適用（重要）
  // -------------------------------------------------------
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume, currentIndex]);

  // -------------------------------------------------------
  // UI 操作
  // -------------------------------------------------------
  const togglePlay = () => setIsPlaying((prev) => !prev);

  const handlePlaybackRateChange = useCallback(
    (e) => {
      const val = Number(e.target.value);
      setPlaybackRate(val);
      data.onPlaybackRateChange?.(id, val);
    },
    [data, id]
  );

  const handleVolumeChange = useCallback(
    (e) => {
      const val = Number(e.target.value);
      setVolume(val);
      data.onVolumeChange?.(id, val);
    },
    [data, id]
  );

  // =======================================================
  // 描画
  // =======================================================
  return (
    <BaseNode {...props}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#111',
        }}
      >
        {/* ---------------- 動画表示 ---------------- */}
        <div
          style={{
            flex: 1,
            background: '#000',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {videos.length === 0 ? (
            <div
              style={{
                color: '#888',
                fontSize: '14px',
                textAlign: 'center',
                padding: '20px',
              }}
            >
              動画ノードを<br />接続してください
            </div>
          ) : (
            <video
              ref={videoRef}
              src={videos[currentIndex].videoUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
              className="nodrag"
              playsInline
            />
          )}

          {/* ファイル名表示 */}
          {videos.length > 0 && videos[currentIndex].fileName && (
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
              {videos[currentIndex].fileName}
            </div>
          )}
        </div>

        {/* ---------------- コントロール ---------------- */}
        {videos.length > 0 && (
          <>
            {/* 再生 / 一時停止 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '10px',
                background: '#222',
              }}
            >
              <button
                onClick={togglePlay}
                className="nodrag"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
            </div>

            {/* ページ表示 */}
            <div
              style={{
                textAlign: 'center',
                padding: '6px',
                fontSize: '12px',
                color: '#ccc',
                borderTop: '1px solid #444',
              }}
            >
              {currentIndex + 1} / {videos.length}
            </div>

            {/* 再生スピード */}
            <div
              style={{
                padding: '8px 10px',
                background: '#1a1a1a',
                borderTop: '1px solid #444',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#aaa' }}>
                <span>再生速度</span>
                <input
                  type="range"
                  min="0.25"
                  max="2"
                  step="0.25"
                  value={playbackRate}
                  onChange={handlePlaybackRateChange}
                  className="nodrag"
                  style={{ flex: 1 }}
                />
                <span style={{ minWidth: '50px', textAlign: 'right' }}>
                  ×{playbackRate.toFixed(2)}
                </span>
              </div>
            </div>

            {/* 音量 */}
            <div
              style={{
                padding: '8px 10px',
                background: '#1a1a1a',
                borderTop: '1px solid #444',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#aaa' }}>
                <span>音量　　</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="nodrag"
                  style={{ flex: 1 }}
                />
                <span style={{ minWidth: '50px', textAlign: 'right' }}>
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </BaseNode>
  );
};

export default memo(VideoSlideShowNode);

