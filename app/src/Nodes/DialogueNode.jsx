import { memo, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from '../Nodes/BaseNode';

const DialogueNode = (props) => {
  const { data, isConnectable } = props;

  const characterName = data.characterName || '';
  const dialogueText = data.dialogueText || '';
  const nameColor = data.nameColor || '#ffccaa';
  
  const onNameChange = useCallback(
    (evt) => {
      if (data.onNameChange) {
        data.onNameChange(props.id, evt.target.value);
      }
    },
    [data.onNameChange, props.id]
  );

  const onTextChange = useCallback(
    (evt) => {
      if (data.onTextChange) {
        data.onTextChange(props.id, evt.target.value);
      }
    },
    [data.onTextChange, props.id]
  );

  const onNameColorChange = useCallback(
    (evt) => {
      if (data.onNameColorChange) {
        data.onNameColorChange(props.id, evt.target.value);
      }
    },
    [data.onNameColorChange, props.id]
  );
  
  return (
    <BaseNode {...props}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#1e1e2e',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {/* キャラクター名入力エリア */}
        <div
          style={{
            padding: '10px 12px',
            background: '#2d2d44',
            borderBottom: '1px solid #444',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <input
            type="text"
            value={characterName}
            onChange={onNameChange}
            placeholder="キャラクター名"
            className="nodrag"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: nameColor,
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          />
          <input
            type="color"
            value={nameColor}
            onChange={onNameColorChange}
            style={{
              width: '40px',
              height: '40px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            title="キャラクター名色"
          />
        </div>

        {/* セリフ入力エリア */}
        <div style={{ flex: 1, padding: '12px' }}>
          <textarea
            value={dialogueText}
            onChange={onTextChange}
            placeholder="ここにセリフを入力...\n（改行も可能です）"
            className="nodrag"
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '15px',
              lineHeight: '1.6',
              resize: 'none',
            }}
          />
        </div>
      </div>
    </BaseNode>
  );
};

export default memo(DialogueNode);