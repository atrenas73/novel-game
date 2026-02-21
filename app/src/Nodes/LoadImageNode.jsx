import { memo, useCallback, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from '../Nodes/BaseNode'; 

// ユーティリティ関数
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const LoadImageNode = (props) => {
  const { data, isConnectable } = props;

  const fileInputRef = useRef(null); 

  const handleNodeClick = useCallback((e) => { 
    e.stopPropagation(); 
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file && data.onUpload && data.nodeId) {
      data.onUpload(data.nodeId, file); 
      e.target.value = null; 
    }
  }, [data.onUpload, data.nodeId]);

  return (
    <BaseNode {...props}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
        }}
      >
        {/* 非表示ファイル入力 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: 'none' }}
          className="nodrag"
        />

        {/* メイン表示 */}
        <div
          style={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          {data.fileName && (
            <div
              style={{
                fontSize: 10,
                color: '#555',
                padding: '2px 5px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%',
                textAlign: 'center',
                boxSizing: 'border-box',
              }}
            >
              {data.fileName}
            </div>
          )}

          {data.imageUrl ? (
            <img
              onClick={handleNodeClick}
              src={data.imageUrl}
              alt={data.label || 'Node Image'}
              className="nodrag"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                cursor: 'pointer',
                flexGrow: 1,
              }}
            />
          ) : (
            <div
              onClick={handleNodeClick}
              style={{
                padding: 10,
                color: '#888',
                cursor: 'pointer',
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              クリックして画像をアップロード
            </div>
          )}
        </div>

        {/* フッター */}
        {(data.fileSize || data.imageWidth) && (
          <div
            style={{
              borderTop: '1px solid #ccc',
              padding: '3px 5px',
              fontSize: 10,
              color: '#000',
              width: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {data.fileSize && <span>Size: {formatBytes(data.fileSize)}</span>}
            </div>
            <div>
              {data.imageWidth && data.imageHeight && (
                <span>
                  Dim: {data.imageWidth}×{data.imageHeight}px
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
};

export default memo(LoadImageNode);
