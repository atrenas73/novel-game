import { memo } from 'react';
import BaseNode from './BaseNode';

const ChoiceNode = (props) => {
  const { data } = props;

  return (
    <BaseNode {...props}>
      {/* ★ 幅100%のラッパーを追加 */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        {/* 質問文 */}
        <textarea
          value={data.question || ''}
          placeholder="質問文を入力"
          onChange={(e) =>
            data.onChange?.({
              ...data,
              question: e.target.value,
            })
          }
          style={{
            width: '100%',
            minHeight: 60,
            resize: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* はい／いいえラベル（Handle位置と一致） */}
        <div
          style={{
            position: 'relative',
            width: '100%',   // ★ これが最重要
            height: 18,
            marginTop: 6,
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '25%',
              transform: 'translateX(-50%)',
              fontSize: 12,
            }}
          >
            はい
          </span>

          <span
            style={{
              position: 'absolute',
              left: '75%',
              transform: 'translateX(-50%)',
              fontSize: 12,
            }}
          >
            いいえ
          </span>
        </div>
      </div>
    </BaseNode>
  );
};

export default memo(ChoiceNode);
