import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from '../Nodes/BaseNode';

const DialogueListNode = (props) => {
  const { data, isConnectable } = props;

  const dialogues = data.dialogues || [];
  const parseColoredText = data.parseColoredText; // Appから受け取る

  return (
    <BaseNode {...props}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#111',
          color: '#eee',
          fontSize: '14px',
        }}
      >
        {/* タイトル */}
        <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #444', textAlign: 'center' }}>
          対話リスト ({dialogues.length}件)
        </div>

        {/* リスト表示エリア */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {dialogues.length === 0 ? (
            <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
              上側のハンドルに<br />対話ノードチェーンを接続してください
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dialogues.map((dlg, i) => (
                <div
                  key={i}
                  style={{
                    background: '#222',
                    borderRadius: '6px',
                    padding: '10px',
                    borderLeft: `4px solid ${dlg.nameColor || '#ffccaa'}`,
                  }}
                >
                  {/* キャラクター名 */}
                  {dlg.characterName && (
                    <div style={{ fontWeight: 'bold', color: dlg.nameColor || '#ffccaa', marginBottom: '4px' }}>
                      {dlg.characterName}
                    </div>
                  )}

                  {/* セリフ本文 */}
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', color: '#eee' }}>
                    {parseColoredText ? parseColoredText(dlg.dialogueText) : dlg.dialogueText || '(空のセリフ)'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 動的ハンドル生成 */}
      {data.handles?.map((handle) => {
        const color = data.DATA_TYPES?.[handle.dataType]?.color || '#95a5a6';

        const handleStyle = {
          ...data.COMMON_HANDLE_STYLE,
          background: color,
        };

        const style = { ...handleStyle };
        if (handle.position === Position.Top || handle.position === Position.Bottom) {
          style.left = '50%';
        } else if (handle.position === Position.Left || handle.position === Position.Right) {
          style.top = '50%';
        }

        return (
          <Handle
            key={handle.id}
            type={handle.type}
            position={handle.position}
            id={handle.id}
            style={style}
            isConnectable={isConnectable}
          />
        );
      })}
    </BaseNode>
  );
};

export default memo(DialogueListNode);