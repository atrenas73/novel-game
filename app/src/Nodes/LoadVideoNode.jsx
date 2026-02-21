import { memo, useCallback, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from '../Nodes/BaseNode';

// サイズ表示用
const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const LoadVideoNode = (props) => {
  const { data, isConnectable } = props;
  const fileInputRef = useRef(null);

  const handleNodeClick = useCallback((e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (data.onUpload && data.nodeId) {
      data.onUpload(data.nodeId, file); // ★ File をそのまま渡す
    }

    e.target.value = null;
  }, [data.onUpload, data.nodeId]);

  return (
    <BaseNode {...props}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
        
        <input
          type="file"
          ref={fileInputRef}
          accept="video/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          className="nodrag"
        />

        <div
          onClick={handleNodeClick}
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
          {data.videoUrl ? (
            <video
              src={data.videoUrl}
              controls
              style={{ maxWidth: '100%', maxHeight: '100%' }}
              className="nodrag"
            />
          ) : (
            <span style={{ color: '#888' }}>クリックして動画を読み込み</span>
          )}
        </div>

        {(data.fileSize || data.videoWidth) && (
          <div
            style={{
              borderTop: '1px solid #ccc',
              fontSize: 10,
              padding: '3px 6px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Size: {data.fileSize && formatBytes(data.fileSize)}</span>
            {data.videoWidth && data.videoHeight && (
              <span>Dim: {data.videoWidth}×{data.videoHeight}px</span>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
};

export default memo(LoadVideoNode);

