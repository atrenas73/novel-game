import { memo, useState, useEffect, useRef, useCallback } from 'react';
import BaseNode from '../Nodes/BaseNode';

const DialoguePreviewNode = (props) => {
  const { id, data } = props;
  const dialogues = data.dialogues || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef(null);

  const currentDialogue = dialogues[currentIndex] || {
    characterName: '---',
    dialogueText: '接続されていません',
    nameColor: '#888',
    label: '未接続',
    headerColor: '#9c27b0',
  };

  const typingSpeed = data.typingSpeed !== undefined ? data.typingSpeed : 50;

  const startTyping = useCallback(() => {
    const fullText = currentDialogue.dialogueText || '';
    setDisplayedText('');
    setIsTyping(true);

    if (timerRef.current) clearInterval(timerRef.current);
    if (!fullText) {
      setIsTyping(false);
      return;
    }

    let idx = 0;
    timerRef.current = setInterval(() => {
      idx++;
      setDisplayedText(fullText.slice(0, idx));
      if (idx >= fullText.length) {
        clearInterval(timerRef.current);
        setIsTyping(false);
      }
    }, typingSpeed);
  }, [currentDialogue.dialogueText, typingSpeed]);

  const handleAdvance = useCallback((e) => {
    if (e.target.closest('.nodrag')) return;
    if (isTyping) {
      if (timerRef.current) clearInterval(timerRef.current);
      setDisplayedText(currentDialogue.dialogueText);
      setIsTyping(false);
    } else {
      if (dialogues.length > 0) {
        setCurrentIndex((prev) => (prev + 1) % dialogues.length);
      }
    }
  }, [isTyping, currentDialogue.dialogueText, dialogues.length]);

  useEffect(() => {
    startTyping();
    return () => clearInterval(timerRef.current);
  }, [currentIndex, startTyping]);

  return (
    <BaseNode {...props}>
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: '#1a1a1a',
          padding: '12px',
          borderRadius: '4px',
        }}
      >
        {/* 現在選択中のノード名 + 進捗表示（背景色を対話ノードのheaderColorに同期） */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: currentDialogue.headerColor || '#9c27b0', 
            padding: '6px 10px',
            borderRadius: '4px',
            border: '1px solid #333',
            marginBottom: '4px',
            fontSize: '12px',
            color: '#fff', // 視認性確保のため白文字
          }}
          className="nodrag"
        >
          <div style={{ fontWeight: 'bold' }}>
            {currentDialogue.label}
          </div>
          <div>
            {dialogues.length > 0
              ? `${currentIndex + 1}/${dialogues.length}`
              : '0/0'}
          </div>
        </div>

        {/* プレビュー本体 */}
        <div
          onClick={handleAdvance}
          style={{
            padding: '12px',
            background: '#222',
            borderRadius: '4px',
            minHeight: '120px',
            cursor: 'pointer',
            border: '1px solid #333',
            position: 'relative',
          }}
        >
          <div
            style={{
              color: currentDialogue.nameColor,
              fontWeight: 'bold',
              fontSize: '13px',
              marginBottom: '6px',
            }}
          >
            {currentDialogue.characterName || '---'}
          </div>
          <div
            style={{
              color: '#fff',
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
            }}
          >
            {displayedText}
            {!isTyping && dialogues.length > 0 && (
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  background: currentDialogue.nameColor,
                  marginLeft: '6px',
                  borderRadius: '50%',
                  animation: 'pulse 1s infinite',
                }}
              />
            )}
          </div>
        </div>

        {/* スライダー */}
        <div
          className="nodrag"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '10px',
            color: '#666',
          }}
        >
          <span>Speed</span>
          <input
            type="range"
            min="1"
            max="100"
            value={typingSpeed}
            onChange={(e) => data.onSpeedChange?.(id, parseInt(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.2; transform: scale(0.8); }
        }
      `}</style>
    </BaseNode>
  );
};

export default memo(DialoguePreviewNode);