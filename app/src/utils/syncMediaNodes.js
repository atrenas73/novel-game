// src/utils/syncMediaNodes.js
// =========================================================
// メディア同期関数（LayerOnOffNode対応版 - 全チェーン収集対応）
// =========================================================

const syncMediaNodes = (currentNodes, currentEdges) => {
  let hasAnyChange = false;

  /* ================= ヘルパー関数: チェーン全体からレイヤーを収集 ================= */
  const collectChainLayers = (startNodeId, allNodes, allEdges) => {
    const collectedLayers = [];
    const processedNodes = new Set();
    
    // 再帰的にチェーンを探索（上流のみ）
    const exploreChain = (nodeId, visited = new Set()) => {
      if (visited.has(nodeId) || processedNodes.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = allNodes.find(n => n.id === nodeId);
      if (!node) return;
      
      // ★ LayerOnOffNodeの場合 - 出力データを直接使用
      if (node.type === 'layerOnOff' && node.data?.outputLayers) {
        if (!processedNodes.has(node.id)) {
          processedNodes.add(node.id);
          
          // outputLayers には既に ON/OFF が適用されたデータが含まれている
          node.data.outputLayers.forEach(layer => {
            collectedLayers.push({
              id: layer.id,
              name: layer.name || layer.id,
              type: layer.type,
              zIndex: layer.zIndex || 0,
              nodeId: node.id,
              data: {
                ...layer.data,  // 元のデータ（画像URL、テキストなど）
                ...layer,       // レイヤー情報
                visible: true,
                sourceType: 'layerOnOff',
                layerId: layer.id,
              },
              source: 'chain'
            });
          });
        }
      }
      // LayerImageNodeの場合
      else if (node.type === 'layerImage' && node.data) {
        if (!processedNodes.has(node.id)) {
          processedNodes.add(node.id);
          
          const editorConfig = node.data.editorConfig;
          const layerKey = node.data.layer || 'image_main';
          const layerConfig = editorConfig?.layers?.[layerKey] || {};
          
          // ★ output があればそれを使用（上流からのデータを継承）
          const outputData = node.data.output || {};
          
          collectedLayers.push({
            id: layerKey,
            name: layerConfig.label || node.data.label || '画像レイヤー',
            type: 'image',
            zIndex: layerConfig.z || 0,
            nodeId: node.id,
            data: {
              ...node.data,
              ...outputData,  // 上流からのデータを優先
              type: 'image',
              sourceType: node.type,
              layerId: layerKey,
              layerName: layerConfig.label,
              layerConfig: layerConfig,
            },
            source: 'chain'
          });
        }
      }
      // LayerTextNodeの場合
      else if (node.type === 'layerText' && node.data) {
        if (!processedNodes.has(node.id)) {
          processedNodes.add(node.id);
          
          const layerKey = node.data.layer || node.data.layerId || 'text_main';
          const editorConfig = node.data.editorConfig;
          const layerConfig = editorConfig?.layers?.[layerKey] || {};
          
          const layerType = layerConfig.type || 'text';
          const zIndex = layerConfig.z || node.data.zIndex || 1000;
          
          // ★ output があればそれを使用（上流からのデータを継承）
          const outputData = node.data.output || {};
          
          collectedLayers.push({
            id: layerKey,
            name: layerConfig.label || node.data.label || 'テキストレイヤー',
            type: layerType,
            zIndex: zIndex,
            nodeId: node.id,
            data: {
              ...node.data,
              ...outputData,  // 上流からのデータを優先
              type: 'text',
              sourceType: node.type,
              layerId: layerKey,
              layerName: layerConfig.label,
              layerConfig: layerConfig,
            },
            source: 'chain'
          });
        }
      }
      
      // このノードへの入力エッジを探してさらに上流を探索
      const inputEdges = allEdges.filter(e => 
        e.target === nodeId && e.targetHandle === 'input'
      );
      
      inputEdges.forEach(edge => {
        exploreChain(edge.source, new Set(visited));
      });
    };
    
    // 探索開始
    exploreChain(startNodeId);
    return collectedLayers;
  };

  /* ================= ヘルパー関数: プレビュー用に全チェーンからレイヤーを収集（上流全体） ================= */
const collectAllUpstreamLayers = (startNodeId, allNodes, allEdges) => {
  const mergedLayerStates = {};
  let foundLayerOnOff = false;

  // 1回目: プレビューから上流を探索してLayerOnOffのON/OFF情報だけ集約
  const visitedForOnOff = new Set();
  const exploreForOnOff = (nodeId) => {
    if (visitedForOnOff.has(nodeId)) return;
    visitedForOnOff.add(nodeId);

    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.type === 'layerOnOff') {
      foundLayerOnOff = true;

      if (node.data?.layerStates) {
        Object.assign(mergedLayerStates, node.data.layerStates);
      } else if (Array.isArray(node.data?.outputLayers)) {
        node.data.outputLayers.forEach(layer => {
          if (layer?.id) mergedLayerStates[layer.id] = true;
        });
      }

      // layerStatesに未定義のレイヤーはconfig.enabledを初期値として扱う
      const configLayers = node.data?.editorConfig?.layers || {};
      Object.entries(configLayers).forEach(([layerId, layerConfig]) => {
        if (mergedLayerStates[layerId] === undefined) {
          mergedLayerStates[layerId] = !!layerConfig?.enabled;
        }
      });
    }

    // 上流のみ探索（previewより下流は探索しない）
    const inputEdges = allEdges.filter(e => e.target === nodeId);
    inputEdges.forEach(edge => exploreForOnOff(edge.source));
  };

  exploreForOnOff(startNodeId);

  // 要件: 上流にLayerOnOffが無い場合は全レイヤーOFF扱い（何も表示しない）
  if (!foundLayerOnOff) {
    return {
      layers: [],
      layerStates: {}
    };
  }

  const onLayerIds = new Set(
    Object.entries(mergedLayerStates)
      .filter(([, isVisible]) => isVisible === true)
      .map(([layerId]) => layerId)
  );

  // ONが1つも無い場合は表示対象なし
  if (onLayerIds.size === 0) {
    return {
      layers: [],
      layerStates: mergedLayerStates
    };
  }

  // 2回目: 再度上流探索して、ON集合に一致するレイヤー情報だけ収集
  const collectedLayers = [];
  const pendingLayerIds = new Set(onLayerIds);
  const visitedForLayerData = new Set();

  const exploreForLayerData = (nodeId) => {
    // 要件: 全ONレイヤー収集完了で探索終了
    if (pendingLayerIds.size === 0) return;

    if (visitedForLayerData.has(nodeId)) return;
    visitedForLayerData.add(nodeId);

    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.type === 'layerImage' || node.type === 'layerText') {
      const layerId = node.data?.layerId || node.data?.layer || `layer_${node.id}`;

      if (pendingLayerIds.has(layerId)) {
        const editorConfig = node.data?.editorConfig;
        const layerConfig = editorConfig?.layers?.[layerId] || {};
        const outputData = node.data?.output || {};

        collectedLayers.push({
          id: layerId,
          name: layerConfig.label || node.data?.label || node.type,
          type: node.type === 'layerImage' ? 'image' : 'text',
          zIndex: layerConfig.z || node.data?.zIndex || 0,
          nodeId: node.id,
          data: {
            imageUrl: outputData.imageUrl ?? node.data?.imageUrl,
            imagePath: outputData.imagePath ?? node.data?.imagePath,
            text: outputData.text ?? node.data?.text,
            characterName: outputData.characterName ?? node.data?.characterName,
            styleId: outputData.styleId ?? node.data?.styleId,
            textStyle: outputData.textStyle ?? node.data?.textStyle,
            imageStyleId: outputData.imageStyleId ?? node.data?.imageStyleId,
            displayX: outputData.displayX ?? node.data?.displayX ?? outputData.x ?? node.data?.x ?? 0,
            displayY: outputData.displayY ?? node.data?.displayY ?? outputData.y ?? node.data?.y ?? 0,
            displayWidth: outputData.displayWidth ?? node.data?.displayWidth ?? outputData.width ?? node.data?.width,
            displayHeight: outputData.displayHeight ?? node.data?.displayHeight ?? outputData.height ?? node.data?.height,
            opacity: outputData.opacity ?? node.data?.opacity,
            blendMode: outputData.blendMode ?? node.data?.blendMode,
            zIndex: outputData.zIndex ?? node.data?.zIndex,
            layerConfig: layerConfig
          },
          source: 'chain',
          sourceNodeId: node.id
        });

        // 要件: 収集できたONレイヤーIDは集合から削除
        pendingLayerIds.delete(layerId);
      }
    }

    // 上流のみ探索（previewより下流は探索しない）
    const inputEdges = allEdges.filter(e => e.target === nodeId);
    inputEdges.forEach(edge => exploreForLayerData(edge.source));
  };

  exploreForLayerData(startNodeId);

  // 上流に見つからないONレイヤーは未収集のまま（=何も表示しない）
  collectedLayers.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  return {
    layers: collectedLayers,
    layerStates: mergedLayerStates
  };
};

  const updatedNodes = currentNodes.map((node) => {
    /* ================= LayerOnOffNode ================= */
    if (node.type === 'layerOnOff') {
      // このノードへの入力エッジを探す
      const incomingEdges = currentEdges.filter(e => 
        e.target === node.id && e.targetHandle === 'input'
      );
      
      if (incomingEdges.length === 0) {
        // 入力がない場合
        if ((node.data.layers || []).length > 0) {
          hasAnyChange = true;
          return { 
            ...node, 
            data: { 
              ...node.data, 
              layers: [] 
            } 
          };
        }
        return node;
      }

      const allCollectedLayers = [];
      const processedNodes = new Set();
      
      // 各入力エッジからチェーン全体を探索
      incomingEdges.forEach(edge => {
        const sourceNodeId = edge.source;
        const chainLayers = collectChainLayers(sourceNodeId, currentNodes, currentEdges);
        
        // 重複を避けて追加
        chainLayers.forEach(layer => {
          if (!processedNodes.has(layer.nodeId)) {
            processedNodes.add(layer.nodeId);
            allCollectedLayers.push(layer);
          }
        });
      });

      // zIndex順にソート
      allCollectedLayers.sort((a, b) => a.zIndex - b.zIndex);

      // 変更があったか確認
      const existingLayers = node.data.layers || [];
      const layersChanged = JSON.stringify(allCollectedLayers) !== JSON.stringify(existingLayers);

      if (layersChanged) {
        hasAnyChange = true;
        console.log('🔄 LayerOnOffNode レイヤー更新:', {
          nodeId: node.id,
          oldCount: existingLayers.length,
          newCount: allCollectedLayers.length,
          layers: allCollectedLayers.map(l => ({ 
            id: l.id, 
            type: l.type,
            name: l.name,
            zIndex: l.zIndex,
            sourceNode: l.nodeId 
          }))
        });
        
        return { 
          ...node, 
          data: { 
            ...node.data, 
            layers: allCollectedLayers 
          } 
        };
      }
      
      return node;
    }

    /* ================= SlideShowNode ================= */
    else if (node.type === 'SlideShowNode') {
      const incoming = currentEdges.find(
        (e) => e.target === node.id && e.targetHandle === 'input'
      );

      if (!incoming) {
        if ((node.data.images || []).length > 0) {
          hasAnyChange = true;
          return { ...node, data: { ...node.data, images: [] } };
        }
        return node;
      }

      const newImages = [];
      let currentId = incoming.source;

      while (currentId) {
        const currentNode = currentNodes.find((n) => n.id === currentId);
        if (currentNode?.data?.imagePath) {
          newImages.push({
            id: currentNode.id,
            imagePath: currentNode.data.imagePath,
            imageUrl: currentNode.data.imageUrl || '',
            fileName: currentNode.data.fileName || 'Unknown',
          });
        }

        const prevEdge = currentEdges.find(
          (e) => e.target === currentId && e.targetHandle === 'input'
        );
        currentId = prevEdge ? prevEdge.source : null;
      }

      newImages.reverse();

      if (JSON.stringify(newImages) !== JSON.stringify(node.data.images || [])) {
        hasAnyChange = true;
        return { ...node, data: { ...node.data, images: newImages } };
      }
      
      return node;
    }

    /* ================= VideoSlideShowNode ================= */
    else if (node.type === 'VideoSlideShowNode') {
      const incoming = currentEdges.find(
        (e) => e.target === node.id && e.targetHandle === 'input'
      );

      if (!incoming) {
        if ((node.data.videos || []).length > 0) {
          hasAnyChange = true;
          return { ...node, data: { ...node.data, videos: [] } };
        }
        return node;
      }

      const newVideos = [];
      let currentId = incoming.source;

      while (currentId) {
        const currentNode = currentNodes.find((n) => n.id === currentId);
        if (currentNode?.data?.videoPath) {
          newVideos.push({
            id: currentNode.id,
            videoPath: currentNode.data.videoPath,
            videoUrl: currentNode.data.videoUrl || '',
            fileName: currentNode.data.fileName || 'Unknown',
          });
        }

        const prevEdge = currentEdges.find(
          (e) => e.target === currentId && e.targetHandle === 'input'
        );
        currentId = prevEdge ? prevEdge.source : null;
      }

      newVideos.reverse();

      if (JSON.stringify(newVideos) !== JSON.stringify(node.data.videos || [])) {
        hasAnyChange = true;
        return { ...node, data: { ...node.data, videos: newVideos } };
      }
      
      return node;
    }

    /* ================= DialoguePreview ================= */
    else if (node.type === 'dialoguePreview') {
      const incoming = currentEdges.find(
        (e) => e.target === node.id && e.targetHandle === 'input'
      );

      if (!incoming) {
        if ((node.data.dialogues || []).length > 0) {
          hasAnyChange = true;
          return { ...node, data: { ...node.data, dialogues: [] } };
        }
        return node;
      }

      const newDialogues = [];
      let currentId = incoming.source;

      while (currentId) {
        const currentNode = currentNodes.find((n) => n.id === currentId);
        if (currentNode?.type === 'dialogue') {
          newDialogues.push({
            id: currentNode.id,
            label: currentNode.data.label || '無題の対話',
            characterName: currentNode.data.characterName || '',
            dialogueText: currentNode.data.dialogueText || '',
            nameColor: currentNode.data.nameColor || '#ffccaa',
            headerColor: currentNode.data.headerColor || '#9c27b0',
          });
        }

        const prevEdge = currentEdges.find(
          (e) => e.target === currentId && e.targetHandle === 'input'
        );
        currentId = prevEdge ? prevEdge.source : null;
      }

      newDialogues.reverse();

      if (JSON.stringify(newDialogues) !== JSON.stringify(node.data.dialogues || [])) {
        hasAnyChange = true;
        return { ...node, data: { ...node.data, dialogues: newDialogues } };
      }
      
      return node;
    }

    /* ================= LayerImageNode ================= */
    else if (node.type === 'layerImage') {
      const inputEdge = currentEdges.find((e) => e.target === node.id);
      if (!inputEdge) return node;

      const sourceNode = currentNodes.find((n) => n.id === inputEdge.source);
      if (!sourceNode) return node;

      if (sourceNode.data?.imagePath) {
        if (node.data.imagePath !== sourceNode.data.imagePath) {
          hasAnyChange = true;
          return {
            ...node,
            data: {
              ...node.data,
              imagePath: sourceNode.data.imagePath,
              imageUrl: sourceNode.data.imageUrl,
            },
          };
        }
      }
      
      return node;
    }
    
    /* ================= LayerTextNode ================= */
    else if (node.type === 'layerText') {
      return node;
    }
    
    /* ================= LayerPreviewNode ================= */
    else if (node.type === 'layerPreview') {
      const incomingEdges = currentEdges.filter(e => 
        e.target === node.id && e.targetHandle === 'input'
      );
      
      if (incomingEdges.length === 0) {
        if ((node.data.layers || []).length > 0) {
          hasAnyChange = true;
          return { 
            ...node, 
            data: { 
              ...node.data, 
              layers: [] 
            } 
          };
        }
        return node;
      }

      // 全ての入力から上流全体のレイヤーを収集
      const allCollected = {
        layers: [],
        layerStates: {}
      };
      
      incomingEdges.forEach(edge => {
        const collected = collectAllUpstreamLayers(edge.source, currentNodes, currentEdges);
        
        // レイヤーをマージ（重複はcollectAllUpstreamLayers内で処理済み）
        collected.layers.forEach(layer => {
          if (!allCollected.layers.some(l => l.id === layer.id)) {
            allCollected.layers.push(layer);
          }
        });
        
        // layerStatesをマージ
        Object.assign(allCollected.layerStates, collected.layerStates);
      });

      // zIndex順にソート
      allCollected.layers.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

      console.log('🔄 LayerPreviewNode 収集結果:', {
        nodeId: node.id,
        totalLayers: allCollected.layers.length,
        layerIds: allCollected.layers.map(l => l.id),
        layerStates: allCollected.layerStates
      });

      // 変更があったか確認
      const existingLayers = node.data.layers || [];
      const existingLayerStates = node.data.layerStates || {};
      
      const layersChanged = JSON.stringify(allCollected.layers) !== JSON.stringify(existingLayers);
      const statesChanged = JSON.stringify(allCollected.layerStates) !== JSON.stringify(existingLayerStates);

      if (layersChanged || statesChanged) {
        hasAnyChange = true;
        console.log(`✅ LayerPreviewNode ${node.id} 更新:`, {
          oldCount: existingLayers.length,
          newCount: allCollected.layers.length
        });
        
        return { 
          ...node, 
          data: { 
            ...node.data, 
            layers: allCollected.layers,
            layerStates: allCollected.layerStates
          } 
        };
      }
      
      return node;
    }

    /* ================= LayerTimelineNode ================= */
    else if (node.type === 'layerTimeline') {
      const incoming = currentEdges.find(
        (e) => e.target === node.id && e.targetHandle === 'input'
      );

      if (!incoming) {
        if ((node.data.frames || []).length > 0) {
          hasAnyChange = true;
          return { ...node, data: { ...node.data, frames: [] } };
        }
        return node;
      }

      // 時系列取得（チェーンを遡る）
      const ordered = [];
      let currentId = incoming.source;

      while (currentId) {
        const n = currentNodes.find((x) => x.id === currentId);
        if (n?.type === 'layerImage' && n.data?.imageUrl) {
          ordered.push(n);
        }
        const prevEdge = currentEdges.find(
          (e) => e.target === currentId && e.targetHandle === 'input'
        );
        currentId = prevEdge ? prevEdge.source : null;
      }

      ordered.reverse(); // 古い → 新しい の順に

      // config から全レイヤーの zIndex を取得
      const layersConfig = node.data.editorConfig?.layers ?? {};
      
      // z値が最も小さいレイヤーを背景レイヤーとみなす
      let minZ = Infinity;
      let backgroundLayerKey = null;

      for (const [key, def] of Object.entries(layersConfig)) {
        const z = def.z ?? 0;
        if (z < minZ) {
          minZ = z;
          backgroundLayerKey = key;
        }
      }

      const layerState = {}; // 最新の各レイヤーの状態を保持
      const frames = [];

      for (const n of ordered) {
        const layerKey = n.data.layer;
        if (!layerKey || !layersConfig[layerKey]) continue;

        const def = layersConfig[layerKey];
        const z = def.z ?? 0;

        layerState[layerKey] = {
          id: n.id,
          imageUrl: n.data.imageUrl,
          x: n.data.x ?? 0,
          y: n.data.y ?? 0,
          scale: n.data.scale ?? 1,
          zIndex: z,
        };

        // 背景レイヤー以外の更新があった場合にのみ新しいフレームを生成
        if (layerKey !== backgroundLayerKey) {
          frames.push({
            layers: Object.values(layerState).sort((a, b) => a.zIndex - b.zIndex),
            backgroundWidth: n.data.backgroundWidth ?? 1280,
            backgroundHeight: n.data.backgroundHeight ?? 720,
          });
        }
      }

      if (JSON.stringify(frames) !== JSON.stringify(node.data.frames || [])) {
        hasAnyChange = true;
        return {
          ...node,
          data: {
            ...node.data,
            frames,
          },
        };
      }
      
      return node;
    }

    return node;
  });

  // デバッグログ
  if (hasAnyChange) {
    console.log('🔄 syncMediaNodes 完了 - 変更あり');
  }

  return hasAnyChange ? updatedNodes : currentNodes;
};

export default syncMediaNodes;
