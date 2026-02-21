import { memo, useState, useEffect, useRef, useCallback } from 'react';
import BaseNode from '../Nodes/BaseNode';

const VisualNovelNode = (props) => {
  const { id, data } = props;

  const dialogues = data.dialogues || [];
  const backgroundImage = data.backgroundImage;
  const typingSpeed = data.typingSpeed ?? 40;

  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);

  const timerRef = useRef(null);

  const current = dialogues[index] || {
    characterName: '',
    dialogueText: '未接続',
    nameColor: '#fff',
  };

  const startTyping = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const full = current.dialogueText || '';
    let i = 0;
    setText('');
    setTyping(true);

    timerRef.current = setInterval(() => {
      i++;
      setText(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(timerRef.current);
        setTyping(false);
      }
    }, typingSpeed);
  }, [current.dialogueText, typingSpeed]);

  const handleClick = () => {
    if (typing) {
      clearInterval(timerRef.current);
      setText(current.dialogueText);
      setTyping(false);
    } else if (dialogues.length > 0) {
      setIndex((prev) => (prev + 1) % dialogues.length);
    }
  };

  useEffect(() => {
    startTyping();
    return () => clearInterval(timerRef.current);
  }, [index, startTyping]);

  return (
    <BaseNode {...props}>
      <div
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : 'linear-gradient(#333,#111)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        {/* メッセージウィンドウ */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0,0,0,0.65)',
            padding: '12px',
            minHeight: '90px',
            borderTop: '1px solid #000',
          }}
        >
          <div
            style={{
              color: current.nameColor,
              fontWeight: 'bold',
              marginBottom: '6px',
              fontSize: '13px',
            }}
          >
            {current.characterName}
          </div>

          <div
            style={{
              color: '#fff',
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
            }}
          >
            {text}
            {!typing && dialogues.length > 0 && (
              <span style={{ marginLeft: 6 }}>▼</span>
            )}
          </div>
        </div>
      </div>
    </BaseNode>
  );
};

export default memo(VisualNovelNode);
