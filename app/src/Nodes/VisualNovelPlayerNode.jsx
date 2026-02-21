import { memo, useCallback, useEffect, useRef, useState } from 'react';
import BaseNode from './BaseNode';

const VisualNovelPlayerNode = (props) => {
  const { data } = props;

  const [timeline, setTimeline] = useState([]);
  const [index, setIndex] = useState(0);

  // 分岐用（★ timelineは書き換えない）
  const [branchStack, setBranchStack] = useState(null);
  // { timeline: [...], index: number }

  const [videoSrc, setVideoSrc] = useState(null);
  const [background, setBackground] = useState(null);

  const [lastDialogue, setLastDialogue] = useState(null);
  const [displayText, setDisplayText] = useState('');

  const typingTimerRef = useRef(null);

  // ===== JSON 読み込み =====
  const handleLoadJson = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        if (!Array.isArray(json.timeline)) return;

        setTimeline(json.timeline);
        setIndex(0);
        setBranchStack(null);

        setBackground(null);
        setLastDialogue(null);
        setDisplayText('');
      } catch {
        alert('JSONの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
  }, []);

  // ★ 現在ノード（分岐中かどうかで切替）
  const current = branchStack
    ? branchStack.timeline[branchStack.index]
    : timeline[index];

  const total = timeline.length;
  const currentIndex = index + 1;

  // ===== image =====
  useEffect(() => {
    if (!current || current.type !== 'image') return;

    let url;
    (async () => {
      const buffer = await window.electronAPI.loadImageAsBlob(current.path);
      const blob = new Blob([new Uint8Array(buffer)]);
      url = URL.createObjectURL(blob);
      setBackground(url);
    })();

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [current]);

  // ===== video =====
  useEffect(() => {
    if (!current || current.type !== 'video') return;

    let url;
    (async () => {
      const buffer = await window.electronAPI.loadVideoAsBlob(current.path);
      const blob = new Blob([new Uint8Array(buffer)], { type: 'video/mp4' });
      url = URL.createObjectURL(blob);
      setVideoSrc(url);
    })();

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [current]);

  // ===== dialogue =====
  useEffect(() => {
    if (!current || current.type !== 'dialogue') return;

    setLastDialogue(current);

    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    const fullText = current.text || '';
    setDisplayText('');

    let i = 0;
    const speed = current.typingSpeed ?? 40;

    typingTimerRef.current = setInterval(() => {
      i++;
      setDisplayText(fullText.slice(0, i));

      if (i >= fullText.length) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }, speed);

    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, [current]);

  // ===== 次へ =====
  const goNext = () => {
    if (!current) return;

    // 分岐再生中
    if (branchStack) {
      if (branchStack.index < branchStack.timeline.length - 1) {
        setBranchStack((b) => ({ ...b, index: b.index + 1 }));
      } else {
        // 分岐終了 → choiceの次へ
        setBranchStack(null);
        setIndex((i) => i + 1);
      }
      return;
    }

    // dialogue 途中なら全文表示
    if (
      current.type === 'dialogue' &&
      displayText.length < (current.text?.length || 0)
    ) {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      setDisplayText(current.text);
      return;
    }

    if (index < timeline.length - 1) {
      setIndex((i) => i + 1);
    }
  };

  // ===== 戻る =====
  const goPrev = () => {
    if (branchStack) {
      if (branchStack.index > 0) {
        setBranchStack((b) => ({ ...b, index: b.index - 1 }));
      } else {
        // 分岐の先頭 → choice に戻る
        setBranchStack(null);
      }
      return;
    }

    if (index > 0) {
      setIndex((i) => i - 1);
    }
  };

  // ===== choice 選択 =====
  const handleSelectChoice = (choice) => {
    setBranchStack({
      timeline: choice.timeline,
      index: 0,
    });
  };

  return (
    <BaseNode {...props}>
      <div
        className="nodrag"
        onClick={current?.type !== 'choice' ? goNext : undefined}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          background: background
            ? `url(${background}) center / cover no-repeat`
            : undefined,
          overflow: 'hidden',
        }}
      >
        {videoSrc && (
          <video
            src={videoSrc}
            autoPlay
            playsInline
            muted
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0,
            }}
          />
        )}
<img
  src={char.path}
  style={{
    position: 'absolute',
    left: char.x,
    top: char.y,
    transform: `scale(${char.scale})`,
    zIndex: char.zIndex,
  }}
/>
        <input
          type="file"
          accept=".json"
          onChange={handleLoadJson}
          style={{ display: 'none' }}
          id={`vn-load-${props.id}`}
        />

        {!timeline.length && (
          <label
            htmlFor={`vn-load-${props.id}`}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              color: '#666',
              cursor: 'pointer',
            }}
          >
            クリックしてノベルを読み込み
          </label>
        )}

        {/* 操作UI（★削除していない） */}
        {timeline.length > 0 && (
          <div
            className="nodrag"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12 + (lastDialogue ? 120 : 0),
              display: 'flex',
              gap: 6,
              fontSize: 12,
              background: 'rgba(0,0,0,0.6)',
              padding: '4px 8px',
              borderRadius: 6,
            }}
          >
            <button onClick={goPrev}>◀</button>
            <span style={{ color: '#fff' }}>
              {currentIndex} / {total}
            </span>
            <button onClick={goNext}>▶</button>
          </div>
        )}

        {/* ===== choice 表示 ===== */}
        {current?.type === 'choice' && (
          <div
            className="nodrag"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '0 20px',
            }}
          >
            {current.choices.map((c, i) => (
              <button
                key={i}
                onClick={() => handleSelectChoice(c)}
                style={{
                  padding: '8px',
                  background: '#222',
                  color: '#fff',
                  border: '1px solid #888',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* ===== セリフ表示 ===== */}
        {lastDialogue && (
          <div
            style={{
              position: 'absolute',
              left: 5,
              right: 5,
              bottom: 5,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                background: 'rgba(0,0,0,0.65)',
                color: lastDialogue.nameColor,
                fontSize: 12,
                fontWeight: 'bold',
                border: `2px solid ${lastDialogue.nameColor}`,
                borderBottom: 'none',
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
              }}
            >
              {lastDialogue.character}
            </div>

            <div
              style={{
                marginTop: -2,
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.65)',
                color: '#fff',
                fontSize: 13,
                lineHeight: 1.6,
                height: `${13 * 1.6 * 4 + 20}px`,
                overflow: 'hidden',
                border: `2px solid ${lastDialogue.nameColor}`,
                borderRadius: 4,
                borderTopLeftRadius: 0,
              }}
            >
              {displayText}
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
};

export default memo(VisualNovelPlayerNode);
