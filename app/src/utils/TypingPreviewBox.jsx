import { useState, useEffect, useRef } from 'react';

export default function TypingPreviewBox({
  style,
  resolved,
  text: fullText,
  maxLines,
}) {
  const f = style?.font || {};
  const l = style?.layout || {};
  const b = style?.box || {};
  const t = style?.typing || { enabled: false, speed: 50, allowSkip: true };

  const [displayedText, setDisplayedText] = useState('');
  const [isSkipped, setIsSkipped] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  const rafRef = useRef(null);
  const startTimeRef = useRef(0);
  const charIndexRef = useRef(0);
  const charsRef = useRef([]);

  useEffect(() => {
    // クリーンアップ
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // リセット
    setDisplayedText('');
    setIsSkipped(false);
    charIndexRef.current = 0;
    charsRef.current = Array.from(fullText);

    if (!t.enabled) {
      setDisplayedText(fullText);
      return;
    }

    startTimeRef.current = performance.now();

    const animate = (now) => {
      // スキップ済みなら何もしない
      if (isSkipped) return;

      const elapsed = now - startTimeRef.current;
      const targetIndex = Math.floor(elapsed / (t.speed ?? 50));

      if (targetIndex > charIndexRef.current) {
        const newIndex = Math.min(targetIndex, charsRef.current.length);
        setDisplayedText(charsRef.current.slice(0, newIndex).join(''));
        charIndexRef.current = newIndex;

        if (newIndex >= charsRef.current.length) {
          return; // 完了
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [fullText, t.enabled, t.speed]); // isSkipped を依存から外す！

  // カーソル点滅
  useEffect(() => {
    if (!t.enabled || isSkipped) return;
    const id = setInterval(() => setShowCursor(v => !v), 500);
    return () => clearInterval(id);
  }, [t.enabled, isSkipped]);

  const handleClick = () => {
    if (t.allowSkip && !isSkipped) {
      setDisplayedText(fullText);
      setIsSkipped(true);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  };

  const visibleText = displayedText
    .split('\n')
    .slice(0, maxLines)
    .join('\n');

  const styleObj = {
    position: 'absolute',
    left: resolved.x,
    top: resolved.y,
    width: resolved.width,
    height: resolved.height,
    fontFamily: f.family || 'sans-serif',
    fontSize: `${f.size || 24}px`,
    lineHeight: f.lineHeight || 1.4,
    color: f.color || '#fff',
    fontWeight: f.bold ? 'bold' : 'normal',
    fontStyle: f.italic ? 'italic' : 'normal',
    textDecoration: f.strike ? 'line-through' : 'none',
    display: 'flex',
    justifyContent: l.alignHorizontal === 'center' ? 'center' : l.alignHorizontal === 'right' ? 'flex-end' : 'flex-start',
    alignItems: l.alignVertical === 'middle' ? 'center' : l.alignVertical === 'bottom' ? 'flex-end' : 'flex-start',
    padding: `${l.padding ?? 0}px`,
    boxSizing: 'border-box',
    background: b.enabled ? (b.background || 'rgba(0,0,0,0.6)') : 'transparent',
    border: b.enabled ? `${b.borderWidth ?? 1}px solid ${b.borderColor ?? '#666'}` : 'none',
    borderRadius: `${b.borderRadius ?? 4}px`,
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    cursor: t.allowSkip ? 'pointer' : 'default',
    pointerEvents: 'auto',
  };

  return (
    <div style={styleObj} onClick={handleClick}>
      {visibleText}
      {t.enabled && !isSkipped && showCursor && visibleText && (
        <span style={{ opacity: 0.8, marginLeft: 2 }}>|</span>
      )}
    </div>
  );
}