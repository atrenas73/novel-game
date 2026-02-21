import { useCallback, memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from '../Nodes/BaseNode';

const TextNode = (props) => {
  const { data, isConnectable } = props;

  const onChange = useCallback(
    (evt) => {
      // 必要ならここで data.onChange や setNodes に反映
      console.log(`Textarea changed for node ${data.label}:`, evt.target.value);
    },
    [data.label]
  );

  return (
    <BaseNode {...props}>
      {/* ---------- Content ---------- */}
      <div
        className="text-updater-content nodrag"
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          padding: 0,
          display: 'flex',
        }}
      >
        <textarea
          onChange={onChange}
          defaultValue={data.value}
          style={{
            width: '100%',
            height: '100%',
            padding: '8px',
            boxSizing: 'border-box',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: '14px',
            lineHeight: '1.4',
            background: 'transparent',
          }}
        />
      </div>
    </BaseNode>
  );
};

export default memo(TextNode);
