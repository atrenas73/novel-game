import { memo, useState, useEffect } from 'react';
import { NodeResizer, Handle, Position } from '@xyflow/react';
import { DATA_TYPES } from '../constants/dataTypes';

const BaseNode = ({ id, data, selected, children, isConnectable }) => {
  const customHeaderColor = data?.headerColor || '#3a8ee6';
  const customBorderColor = data?.borderColor || '#1a192b';

  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label || '');

  /* ---------- 共通ハンドルスタイル ---------- */
  const COMMON_HANDLE_STYLE = {
    width: 8,
    height: 8,
    borderRadius: '50%',
    border: '3px solid #333',
  };

  useEffect(() => {
    setLabel(data.label || '');
  }, [data.label]);

  useEffect(() => {
    if (data.startEdit) {
      setEditing(true);
      data.onClearStartEdit?.(id);
    }
  }, [data.startEdit, data, id]);

  const commitLabel = () => {
    setEditing(false);
    if (data.onLabelChange && label !== data.label) {
      data.onLabelChange(id, label);
    }
  };

  const cancelEdit = () => {
    setLabel(data.label || '');
    setEditing(false);
  };

  const startEditing = (e) => {
    e.stopPropagation();
    setEditing(true);
  };

  return (
    <>
      <NodeResizer
        isVisible={selected && !editing}
        minWidth={120}
        minHeight={60}
        lineStyle={{ borderColor: '#ff0071' }}
        handleStyle={{ backgroundColor: '#ff0071' }}
      />

      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${customBorderColor}`,
          borderRadius: 6,
          overflow: 'hidden',
          backgroundColor: selected ? '#f0f0f0' : '#ffffff',
          boxShadow: selected ? '0 0 0 2px #ff0071' : 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '6px 10px',
            backgroundColor: customHeaderColor,
            color: 'white',
            fontWeight: 'bold',
            borderBottom: `1px solid ${customBorderColor}`,
            textAlign: 'center',
            fontSize: 14,
            minHeight: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            cursor: 'text',
          }}
          onDoubleClick={startEditing}
        >
          {editing ? (
            <input
              className="nodrag nowheel"
              value={label}
              autoFocus
              onChange={(e) => setLabel(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitLabel();
                if (e.key === 'Escape') cancelEdit();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                fontSize: 14,
                textAlign: 'center',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'white',
              }}
            />
          ) : (
            label || 'Base Node'
          )}
        </div>

        {/* Content */}
        <div
          style={{
            flexGrow: 1,
            padding: 10,
            backgroundColor: '#f9f9f9',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 50,
          }}
        >
          {children}

          {/* ★ 動的ハンドル生成 */}
          {data.handles?.map((handle) => {
            const color = DATA_TYPES[handle.dataType]?.color || DATA_TYPES.generic;

            const style = {
              ...COMMON_HANDLE_STYLE,
              background: color,
            };

            // 上下ハンドル → left を offset で制御
            if (handle.position === Position.Top || handle.position === Position.Bottom) {
              style.left = `${(handle.offset ?? 0.5) * 100}%`;
            }

            // 左右ハンドル → top を offset で制御
            if (handle.position === Position.Left || handle.position === Position.Right) {
              style.top = `${(handle.offset ?? 0.5) * 100}%`;
            }

            return (
              <Handle
                key={handle.id}
                id={handle.id}
                type={handle.type}
                position={handle.position}
                style={style}
                isConnectable={isConnectable}
              />
            );
          })}
        </div>
      </div>
    </>
  );
};

export default memo(BaseNode);