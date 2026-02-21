import React, { memo, useEffect, useState, useCallback, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from './BaseNode';

const LayerOnOffNode = (props) => {
  const { data, id } = props;
  
  const safeData = useMemo(() => ({
    ...data,
    label: data?.label || 'レイヤー表示制御',
    headerColor: data?.headerColor || '#4CAF50',
    borderColor: data?.borderColor || '#388E3C',
    DATA_TYPES: data?.DATA_TYPES || {}
  }), [data]);

  const [configLayers, setConfigLayers] = useState([]);
  const [layerStates, setLayerStates] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [layerTypes, setLayerTypes] = useState([]);
  
  // ★ 上流のデータを保持（新規）
  const [upstreamLayers, setUpstreamLayers] = useState([]);

  // 初期レイヤータイプ（フォールバック用）
  const DEFAULT_LAYER_TYPES = [
    { id: 'all', name: '全て', color: '#4fc' },
    { id: 'image', name: '画像', color: '#4af' },
    { id: 'text', name: '文', color: '#fa4' },
    { id: 'ui', name: 'UI', color: '#8f4' }
  ];

  // 1. LoadConfig からレイヤー定義とタイプを取得（UI表示用）
  useEffect(() => {
    const loadConfigLayers = async () => {
      try {
        const config = await window.electronAPI?.loadConfig?.();
        
        if (config?.layers) {
          const layersFromConfig = Object.entries(config.layers).map(([layerId, layerConfig]) => ({
            id: layerId,
            name: layerConfig.label || layerId,
            type: layerConfig.type || 'unknown',
            zIndex: layerConfig.z || 0,
            enabled: layerConfig.enabled || false,
            config: layerConfig
          }));
          
          layersFromConfig.sort((a, b) => a.zIndex - b.zIndex);
          setConfigLayers(layersFromConfig);
          
          // 設定からレイヤータイプを取得
          if (config.layerTypes && Object.keys(config.layerTypes).length > 0) {
            const typesFromConfig = Object.entries(config.layerTypes).map(([typeId, typeConfig]) => ({
              id: typeId,
              name: typeConfig.name || typeId,
              color: typeConfig.color || getDefaultColor(typeId)
            }));
            
            const allTab = { id: 'all', name: '全て', color: '#4fc' };
            setLayerTypes([allTab, ...typesFromConfig]);
          } else {
            setLayerTypes(DEFAULT_LAYER_TYPES);
          }
        }
      } catch (error) {
        console.error('Config読み込みエラー:', error);
        setLayerTypes(DEFAULT_LAYER_TYPES);
      }
    };

    loadConfigLayers();
  }, []);

  // デフォルトカラー取得ヘルパー関数
  const getDefaultColor = (typeId) => {
    const colorMap = {
      'image': '#4af',
      'text': '#fa4',
      'ui': '#8f4',
      'video': '#f4a',
      'audio': '#8cf',
      '3d': '#c8f',
      'effect': '#fc4',
      'mask': '#a8f',
      'adjustment': '#4fc'
    };
    return colorMap[typeId] || '#888';
  };

  // ★ 修正：上流データを保持し、表示状態を初期化
  useEffect(() => {
    if (!data?.layers) return;
    
    // 上流データを保存
    setUpstreamLayers(data.layers);
    
    // 上流の表示状態をlayerStatesの初期値として設定
    setLayerStates(prev => {
      const newStates = { ...prev };
      data.layers.forEach(layer => {
        // 上流のvisible状態を引き継ぐ（なければconfigのenabledを使用）
        if (layer.visible !== undefined) {
          newStates[layer.id] = layer.visible;
        } else if (newStates[layer.id] === undefined) {
          // configから既に設定済みの場合はそのまま
          const configLayer = configLayers.find(cl => cl.id === layer.id);
          newStates[layer.id] = configLayer?.enabled || false;
        }
      });
      return newStates;
    });
    
    console.log('[LayerOnOffNode] 上流データを受信:', {
      layers: data.layers.map(l => ({ id: l.id, visible: l.visible }))
    });
    
  }, [data?.layers, configLayers]);

  // 3. 表示/非表示を切り替え
  const toggleLayer = useCallback((layerId) => {
    setLayerStates(prev => {
      const newStates = {
        ...prev,
        [layerId]: !prev[layerId]
      };
      
      console.log(`[LayerOnOffNode:${id}] トグル:`, {
        layerId,
        newState: newStates[layerId]
      });
      
      return newStates;
    });
  }, [id]);

  // 4. 表示中のレイヤーを全てON/OFF
  const toggleCurrentLayers = useCallback((visible) => {
    const currentLayers = getCurrentTabLayers();
    setLayerStates(prev => {
      const newStates = { ...prev };
      currentLayers.forEach(layer => {
        newStates[layer.id] = visible;
      });
      
      console.log(`[LayerOnOffNode:${id}] 一括設定:`, {
        visible,
        layers: currentLayers.map(l => l.id)
      });
      
      return newStates;
    });
  }, [activeTab, configLayers, id]);

  // 現在のタブのレイヤーを取得（UI表示用）
  const getCurrentTabLayers = useCallback(() => {
    if (activeTab === 'all') return configLayers;
    return configLayers.filter(layer => layer.type === activeTab);
  }, [activeTab, configLayers]);

  // 統計情報（UI表示用）
  const stats = useMemo(() => {
    const visibleCount = configLayers.filter(l => layerStates[l.id]).length;
    
    const tabStats = {};
    layerTypes.forEach(type => {
      const typeLayers = type.id === 'all' 
        ? configLayers 
        : configLayers.filter(l => l.type === type.id);
      const visible = typeLayers.filter(l => layerStates[l.id]).length;
      tabStats[type.id] = { total: typeLayers.length, visible };
    });
    
    const currentLayers = getCurrentTabLayers();
    const currentVisible = currentLayers.filter(l => layerStates[l.id]).length;
    
    return {
      total: configLayers.length,
      visible: visibleCount,
      tabStats,
      currentLayers: currentLayers.length,
      currentVisible
    };
  }, [configLayers, layerStates, layerTypes, getCurrentTabLayers]);

  // ★ 修正：出力データの生成（上流データをベースにON/OFFを適用）
  const outputData = useMemo(() => {
    // 上流データがない場合は空配列
    if (!upstreamLayers.length) {
      return {
        layers: [],
        layerStates: layerStates,
        _nodeType: 'LayerOnOffNode',
        _timestamp: Date.now()
      };
    }
    
    // 上流データをフィルタリングして出力
    const visibleLayers = upstreamLayers
      .filter(layer => layerStates[layer.id])
      .map(layer => ({
        ...layer,  // 上流のデータをそのまま保持（画像URL、テキスト内容など）
        visible: true,  // ON/OFF状態を上書き
        passedThrough: true  // このノードを通過したことを示す
      }));
    
    // zIndexでソート
    visibleLayers.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    return {
      layers: visibleLayers,
      layerStates: layerStates,
      _nodeType: 'LayerOnOffNode',
      _timestamp: Date.now()
    };
  }, [upstreamLayers, layerStates]);

  // 自身のdataを更新
  useEffect(() => {
    if (props.data) {
      props.data.layerStates = layerStates;
      props.data.outputLayers = outputData.layers;
      props.data._timestamp = Date.now();
      
      console.log(`[LayerOnOffNode:${id}] 出力更新:`, {
        layerStates,
        visibleCount: outputData.layers.length
      });
    }
  }, [layerStates, outputData, id, props.data]);

  // 現在のタブのレイヤー（UI表示用）
  const currentLayers = getCurrentTabLayers();

  return (
    <BaseNode nodeId={id} data={safeData}>
      <Handle
        id="input"
        type="target"
        position={Position.Top}
        isConnectable={true}
      />

      {/* UI部分は同じ */}
      <div style={{ 
        width: '300px',
        padding: '10px',
        background: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
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
            color: '#4fc'
          }}>
            レイヤー表示制御
          </div>
          <div style={{
            fontSize: '10px',
            color: '#aaa'
          }}>
            表示中: {stats.currentVisible}/{stats.currentLayers}
          </div>
        </div>

        {/* タイプタブ */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '3px',
          marginBottom: '6px'
        }}>
          {layerTypes.map(type => {
            const typeStats = stats.tabStats[type.id];
            const isActive = activeTab === type.id;
            
            return (
              <button
                key={type.id}
                onClick={() => setActiveTab(type.id)}
                style={{
                  padding: '3px 6px',
                  fontSize: '9px',
                  background: isActive ? type.color : '#2a2a2a',
                  border: `1px solid ${isActive ? type.color : '#444'}`,
                  borderRadius: '3px',
                  color: isActive ? '#fff' : '#aaa',
                  cursor: 'pointer',
                  flex: '1 0 auto',
                  minWidth: '40px',
                  textAlign: 'center'
                }}
                title={`${type.name}: ON ${typeStats?.visible || 0}/${typeStats?.total || 0}`}
              >
                {type.name}
              </button>
            );
          })}
        </div>

        {/* レイヤーボタングリッド */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '4px',
          marginBottom: '8px'
        }}>
          {currentLayers.map(layer => {
            const isVisible = !!layerStates[layer.id];
            const hasChain = upstreamLayers.some(ul => ul.id === layer.id);
            const zDisplay = String(layer.zIndex).padStart(2, '0');
            
            const layerType = layerTypes.find(t => t.id === layer.type);
            const typeColor = layerType?.color || '#888';
            
            return (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                style={{
                  padding: '4px 2px',
                  background: isVisible ? '#2a2a2a' : '#222',
                  border: `1px solid ${isVisible ? typeColor : '#333'}`,
                  borderRadius: '3px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  color: hasChain ? '#4af' : '#aaa',
                  opacity: isVisible ? 1 : 0.6,
                  position: 'relative',
                  minHeight: '30px'
                }}
                title={`${layer.name} (z:${layer.zIndex})\nID: ${layer.id}\nタイプ: ${layer.type}\n${hasChain ? '✓ データあり' : ''}`}
              >
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  left: '2px',
                  fontSize: '8px',
                  color: isVisible ? typeColor : '#666'
                }}>
                  {isVisible ? '●' : '○'}
                </div>
                
                <div style={{
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {zDisplay}
                </div>
                
                {hasChain && (
                  <div style={{
                    position: 'absolute',
                    bottom: '1px',
                    right: '1px',
                    width: '4px',
                    height: '4px',
                    background: '#0f0',
                    borderRadius: '50%'
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* 操作ボタン */}
        <div style={{
          display: 'flex',
          gap: '4px'
        }}>
          <button
            onClick={() => toggleCurrentLayers(true)}
            style={{
              flex: 1,
              padding: '6px 4px',
              fontSize: '10px',
              background: '#2a5',
              border: 'none',
              borderRadius: '3px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            全てON
          </button>
          <button
            onClick={() => toggleCurrentLayers(false)}
            style={{
              flex: 1,
              padding: '6px 4px',
              fontSize: '10px',
              background: '#a22',
              border: 'none',
              borderRadius: '3px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            全てOFF
          </button>
        </div>
      </div>

      <Handle
        id="output"
        type="source"
        position={Position.Bottom}
        isConnectable={true}
        style={{
          background: outputData.layers.length > 0 ? '#4fc' : '#666',
          width: '8px',
          height: '8px'
        }}
      />
    </BaseNode>
  );
};

export default memo(LayerOnOffNode);