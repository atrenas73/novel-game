import React, { memo, useEffect, useState, useMemo, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from '../Nodes/BaseNode';

const LayerPreviewNode = (props) => {
  const { data, id, isConnectable } = props;
  
  const safeData = useMemo(() => ({
    ...data,
    label: data?.label || 'レイヤープレビュー',
    headerColor: data?.headerColor || '#9C27B0',
    borderColor: data?.borderColor || '#7B1FA2',
    DATA_TYPES: data?.DATA_TYPES || {}
  }), [data]);

  // 表示するレイヤー
  const [displayLayers, setDisplayLayers] = useState([]);
  // 画像読み込み状態
  const [imageLoadErrors, setImageLoadErrors] = useState({});

  // レイヤーを描画順にソート（zIndexの昇順）
  const sortLayersByZIndex = useCallback((layers) => {
    return [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, []);

  // layerStatesを適用して表示レイヤーをフィルタリング
  useEffect(() => {
    if (!data?.layers) {
      setDisplayLayers([]);
      return;
    }

    // layerStatesを取得（inputsからのデータを優先）
    const layerStates = data?.inputs?.layerStates || data?.layerStates || {};
    
    console.log(`[LayerPreviewNode:${id}] レイヤー状態:`, {
      hasLayerStates: Object.keys(layerStates).length > 0,
      layerStatesKeys: Object.keys(layerStates),
      layersCount: data.layers.length,
      hasInputs: !!data?.inputs
    });

    // layerStatesを適用して表示するレイヤーをフィルタリング
    const visibleLayers = data.layers
      .map(layer => {
        // レイヤーIDを取得
        const layerId = layer.id || layer.layerId;
        if (!layerId) return null;
        
        // layerStatesで明示的にfalseなら非表示
        const isVisible = layerStates[layerId] !== false;
        
        return {
          ...layer,
          visible: isVisible,
          layerId: layerId
        };
      })
      .filter(layer => layer !== null && layer.visible) // visible=trueのものだけ残す
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)); // zIndexでソート

    console.log(`[LayerPreviewNode:${id}] 描画レイヤー:`, {
      total: data.layers.length,
      visible: visibleLayers.length,
      layers: visibleLayers.map(l => ({ id: l.id, visible: l.visible }))
    });

    setDisplayLayers(visibleLayers);
  }, [data?.layers, data?.inputs, data?.layerStates, id]);

  // 画像読み込みエラーハンドラ
  const handleImageError = useCallback((layerId, e) => {
    console.error(`[LayerPreviewNode] 画像読み込み失敗: ${layerId}`, e.target.src);
    setImageLoadErrors(prev => ({
      ...prev,
      [layerId]: true
    }));
  }, []);

  // キャンバスサイズ
  const canvasWidth = data.editorConfig?.canvas?.width || 1280;
  const canvasHeight = data.editorConfig?.canvas?.height || 720;

  return (
    <BaseNode nodeId={id} data={safeData}>
      <Handle
        id="input"
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />

      <div style={{ 
        width: '100%',
        padding: '12px',
        background: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '6px',
          borderBottom: '1px solid #333'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 'bold',
            color: '#9C27B0'
          }}>
            レイヤープレビュー
          </div>
          <div style={{
            fontSize: '10px',
            color: '#aaa'
          }}>
            表示: {displayLayers.length}/{data?.layers?.length || 0}
          </div>
        </div>

        {/* プレビューキャンバス */}
        <div style={{
          position: 'relative',
          width: canvasWidth,
          height: canvasHeight,
          background: '#222',
          border: '1px solid #444',
          borderRadius: '4px',
          overflow: 'hidden',
          margin: '0 auto'
        }}>
          {/* 背景グリッド */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            pointerEvents: 'none'
          }} />

          {/* レイヤー描画 */}
          {displayLayers.map((layer) => {
            if (layer.type === 'image') {
              // 画像レイヤー
              const imageUrl = layer.data?.imageUrl || layer.imageUrl;
              if (!imageUrl || imageLoadErrors[layer.id]) return null;

              return (
                <div
                  key={`${layer.id}-${layer.nodeId}`}
                  style={{
                    position: 'absolute',
                    left: layer.data?.displayX || 0,
                    top: layer.data?.displayY || 0,
                    width: layer.data?.displayWidth || 'auto',
                    height: layer.data?.displayHeight || 'auto',
                    opacity: layer.data?.opacity || 1,
                    mixBlendMode: layer.data?.blendMode || 'normal',
                    filter: layer.data?.filters ? 
                      `brightness(${layer.data.filters.brightness}) contrast(${layer.data.filters.contrast}) saturate(${layer.data.filters.saturation}) blur(${layer.data.filters.blur}px)` : 
                      'none',
                    pointerEvents: 'none',
                    zIndex: layer.zIndex || 0
                  }}
                >
                  <img
                    src={imageUrl}
                    alt={layer.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: layer.data?.scaleMode || 'cover',
                      display: 'block'
                    }}
                    onError={(e) => handleImageError(layer.id, e)}
                  />
                </div>
              );
            } else if (layer.type === 'text') {
              // テキストレイヤー
              const textStyle = layer.data?.textStyle || {};
              const text = layer.data?.text || '';
              
              return (
                <div
                  key={`${layer.id}-${layer.nodeId}`}
                  style={{
                    position: 'absolute',
                    left: layer.data?.displayX || 0,
                    top: layer.data?.displayY || 0,
                    width: layer.data?.displayWidth || 'auto',
                    height: layer.data?.displayHeight || 'auto',
                    color: textStyle.font?.color || '#fff',
                    fontSize: textStyle.font?.size || 16,
                    fontFamily: textStyle.font?.family || 'sans-serif',
                    fontWeight: textStyle.font?.bold ? 'bold' : 'normal',
                    fontStyle: textStyle.font?.italic ? 'italic' : 'normal',
                    textDecoration: textStyle.font?.strike ? 'line-through' : 'none',
                    lineHeight: textStyle.font?.lineHeight || 1.4,
                    padding: textStyle.layout?.padding || 0,
                    background: textStyle.box?.enabled ? textStyle.box.background : 'transparent',
                    border: textStyle.box?.enabled ? 
                      `${textStyle.box.borderWidth}px solid ${textStyle.box.borderColor}` : 
                      'none',
                    borderRadius: textStyle.box?.enabled ? textStyle.box.borderRadius : 0,
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    pointerEvents: 'none',
                    zIndex: layer.zIndex || 0
                  }}
                >
                  {text}
                </div>
              );
            }
            return null;
          })}

          {/* デバッグ情報 */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              fontSize: 10,
              padding: '4px 8px',
              borderRadius: 4,
              zIndex: 9999
            }}>
              {displayLayers.map(l => `${l.id}:${l.visible ? 'ON' : 'OFF'}`).join(' | ')}
            </div>
          )}
        </div>
      </div>

      <Handle
        id="output"
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{
          background: displayLayers.length > 0 ? '#9C27B0' : '#666',
          width: '10px',
          height: '10px'
        }}
      />
    </BaseNode>
  );
};

export default memo(LayerPreviewNode);