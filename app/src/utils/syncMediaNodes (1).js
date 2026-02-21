// src/utils/syncMediaNodes.js
// =========================================================
// ãƒ¡ãƒ‡ã‚£ã‚¢åŒæœŸé–¢æ•°ï¼ˆLayerOnOffNodeå¯¾å¿œç‰ˆ - å…¨ãƒã‚§ãƒ¼ãƒ³åŽé›†å¯¾å¿œï¼‰
// =========================================================

const syncMediaNodes = (currentNodes, currentEdges) => {
  let hasAnyChange = false;

  /* ================= ãƒ˜ãƒ«ãƒ‘ãƒ¼é–¢æ•°: ãƒã‚§ãƒ¼ãƒ³å…¨ä½“ã‹ã‚‰ãƒ¬ã‚¤ãƒ¤ãƒ¼ã‚’åŽé›† ================= */
  const collectChainLayers = (startNodeId, allNodes, allEdges) => {
    const collectedLayers = [];
    const processedNodes = new Set();
    
    // å†å¸°çš„ã«ãƒã‚§ãƒ¼ãƒ³ã‚’æŽ¢ç´¢ï¼ˆä¸Šæµã®ã¿ï¼‰
    const exploreChain = (nodeId, visited = new Set()) => {
      if (visited.has(nodeId) || processedNodes.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = allNodes.find(n => n.id === nodeId);
      if (!node) return;
      
      // LayerImageNodeã®å ´åˆ
      if (node.type === 'layerImage' && node.data) {
        if (!processedNodes.has(node.id)) {
          processedNodes.add(node.id);
          
          const editorConfig = node.data.editorConfig;
          const layerKey = node.data.layer || 'image_main';
          const layerConfig = editorConfig?.layers?.[layerKey] || {};
          
          collectedLayers.push({
            id: layerKey,
            name: layerConfig.label || node.data.label || 'ç”»åƒãƒ¬ã‚¤ãƒ¤ãƒ¼',
            type: 'image',
            zIndex: layerConfig.z || 0,
            nodeId: node.id,
            data: {
              ...node.data,
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
      // LayerTextNodeã®å ´åˆ
      else if (node.type === 'layerText' && node.data) {
        if (!processedNodes.has(node.id)) {
          processedNodes.add(node.id);
          
          const layerKey = node.data.layer || node.data.layerId || 'text_main';
          const editorConfig = node.data.editorConfig;
          const layerConfig = editorConfig?.layers?.[layerKey] || {};
          
          const layerType = layerConfig.type || 'text';
          const zIndex = layerConfig.z || node.data.zIndex || 1000;
          
          collectedLayers.push({
            id: layerKey,
            name: layerConfig.label || node.data.label || 'ãƒ†ã‚­ã‚¹ãƒˆãƒ¬ã‚¤ãƒ¤ãƒ¼',
            type: layerType,
            zIndex: zIndex,
            nodeId: node.id,
            data: {
              ...node.data,
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
      
      // ã“ã®ãƒŽãƒ¼ãƒ‰ã¸ã®å…¥åŠ›ã‚¨ãƒƒã‚¸ã‚’æŽ¢ã—ã¦ã•ã‚‰ã«ä¸Šæµã‚’æŽ¢ç´¢
      const inputEdges = allEdges.filter(e => 
        e.target === nodeId && e.targetHandle === 'input'
      );
      
      inputEdges.forEach(edge => {
        exploreChain(edge.source, new Set(visited));
      });
    };
    
    // æŽ¢ç´¢é–‹å§‹
    exploreChain(startNodeId);
    return collectedLayers;
  };

  /* ================= Helper: collect layers for a specific LayerPreview ================= */
  // Each LayerPreview only shows layers reachable from its direct input edges.
  // Traversal stops at layerOnOff nodes (which control visibility).
  // layerPreview nodes in the upstream chain do NOT block traversal here.
  const collectLayersForPreview = (startNodeId, allNodes, allEdges) => {
    const collectedLayers = [];
    const processedNodeIds = new Set();
    const layerStates = {};

    const explore = (nodeId, visited = new Set()) => {
      if (visited.has(nodeId) || processedNodeIds.has(nodeId)) return;
      visited.add(nodeId);
      processedNodeIds.add(nodeId);

      const node = allNodes.find(n => n.id === nodeId);
      if (!node) return;

      if (node.type === 'layerImage' || node.type === 'layerText') {
        const layerId = node.data?.layerId || node.data?.layer || ('layer_' + node.id);
        const editorConfig = node.data?.editorConfig;
        const layerConfig = editorConfig?.layers?.[layerId] || {};

        const layerInfo = {
          id: layerId,
          name: layerConfig.label || node.data?.label || node.type,
          type: node.type === 'layerImage' ? 'image' : 'text',
          zIndex: layerConfig.z || node.data?.zIndex || 0,
          nodeId: node.id,
          data: {
            imageUrl: node.data?.imageUrl,
            imagePath: node.data?.imagePath,
            text: node.data?.text,
            styleId: node.data?.styleId,
            imageStyleId: node.data?.imageStyleId,
            displayX: node.data?.displayX,
            displayY: node.data?.displayY,
            displayWidth: node.data?.displayWidth,
            displayHeight: node.data?.displayHeight,
            opacity: node.data?.opacity,
            blendMode: node.data?.blendMode,
            zIndex: node.data?.zIndex,
            layerConfig: layerConfig
          },
          source: 'chain',
          sourceNodeId: node.id
        };

        if (!collectedLayers.some(l => l.sourceNodeId === node.id)) {
          collectedLayers.push(layerInfo);
        }
      }

      // Collect layerStates from layerOnOff nodes, with fallback to outputLayers
      if (node.type === 'layerOnOff') {
        const saved = node.data?.layerStates || {};
        if (Object.keys(saved).length > 0) {
          Object.assign(layerStates, saved);
        } else if (Array.isArray(node.data?.outputLayers) && node.data.outputLayers.length > 0) {
          node.data.outputLayers.forEach(l => { layerStates[l.id] = l.visible !== false; });
        } else if (node.data?.editorConfig?.layers) {
          Object.keys(node.data.editorConfig.layers).forEach(k => { layerStates[k] = true; });
        }
      }

      // Continue traversal upstream (stop at other layerPreview nodes)
      if (node.type !== 'layerPreview' || nodeId === startNodeId) {
        const inputEdges = allEdges.filter(e => e.target === nodeId);
        inputEdges.forEach(edge => {
          explore(edge.source, new Set(visited));
        });
      }
    };

    explore(startNodeId);

    collectedLayers.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    return { layers: collectedLayers, layerStates };
  };

  const updatedNodes = currentNodes.map((node) => {
    /* ================= LayerOnOffNode ================= */
    if (node.type === 'layerOnOff') {
      // ã“ã®ãƒŽãƒ¼ãƒ‰ã¸ã®å…¥åŠ›ã‚¨ãƒƒã‚¸ã‚’æŽ¢ã™
      const incomingEdges = currentEdges.filter(e => 
        e.target === node.id && e.targetHandle === 'input'
      );
      
      if (incomingEdges.length === 0) {
        // å…¥åŠ›ãŒãªã„å ´åˆ
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
      
      // å„å…¥åŠ›ã‚¨ãƒƒã‚¸ã‹ã‚‰ãƒã‚§ãƒ¼ãƒ³å…¨ä½“ã‚’æŽ¢ç´¢
      incomingEdges.forEach(edge => {
        const sourceNodeId = edge.source;
        const chainLayers = collectChainLayers(sourceNodeId, currentNodes, currentEdges);
        
        // é‡è¤‡ã‚’é¿ã‘ã¦è¿½åŠ 
        chainLayers.forEach(layer => {
          if (!processedNodes.has(layer.nodeId)) {
            processedNodes.add(layer.nodeId);
            allCollectedLayers.push(layer);
          }
        });
      });

      // zIndexé †ã«ã‚½ãƒ¼ãƒˆ
      allCollectedLayers.sort((a, b) => a.zIndex - b.zIndex);

      // å¤‰æ›´ãŒã‚ã£ãŸã‹ç¢ºèª
      const existingLayers = node.data.layers || [];
      const layersChanged = JSON.stringify(allCollectedLayers) !== JSON.stringify(existingLayers);

      if (layersChanged) {
        hasAnyChange = true;
        console.log('ðŸ”„ LayerOnOffNode ãƒ¬ã‚¤ãƒ¤ãƒ¼æ›´æ–°:', {
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
            label: currentNode.data.label || 'ç„¡é¡Œã®å¯¾è©±',
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
    }
    
    /* ================= LayerTextNode ================= */
    else if (node.type === 'layerText') {
      const incoming = currentEdges.find(
        (e) => e.target === node.id && e.targetHandle === 'input'
      );

      if (!incoming) {
        if (node.data.text || node.data.characterName) {
          hasAnyChange = true;
          return {
            ...node,
            data: {
              ...node.data,
              text: '',
              characterName: '',
            },
          };
        }
        return node;
      }
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

      // å…¨ã¦ã®å…¥åŠ›ã‹ã‚‰ä¸Šæµå…¨ä½“ã®ãƒ¬ã‚¤ãƒ¤ãƒ¼ã‚’åŽé›†
      const allCollected = {
        layers: [],
        layerStates: {}
      };
      
      incomingEdges.forEach(edge => {
        const collected = collectLayersForPreview(edge.source, currentNodes, currentEdges);
        
        // ãƒ¬ã‚¤ãƒ¤ãƒ¼ã‚’ãƒžãƒ¼ã‚¸ï¼ˆé‡è¤‡ã¯collectLayersForPreviewå†…ã§å‡¦ç†æ¸ˆã¿ï¼‰
        collected.layers.forEach(layer => {
          if (!allCollected.layers.some(l => l.id === layer.id)) {
            allCollected.layers.push(layer);
          }
        });
        
        // layerStatesã‚’ãƒžãƒ¼ã‚¸
        Object.assign(allCollected.layerStates, collected.layerStates);
      });

      // zIndexé †ã«ã‚½ãƒ¼ãƒˆ
      allCollected.layers.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

      console.log('ðŸ”„ LayerPreviewNode åŽé›†çµæžœ:', {
        nodeId: node.id,
        totalLayers: allCollected.layers.length,
        layerIds: allCollected.layers.map(l => l.id),
        layerStates: allCollected.layerStates
      });

      // å¤‰æ›´ãŒã‚ã£ãŸã‹ç¢ºèª
      const existingLayers = node.data.layers || [];
      const existingLayerStates = node.data.layerStates || {};
      
      const layersChanged = JSON.stringify(allCollected.layers) !== JSON.stringify(existingLayers);
      const statesChanged = JSON.stringify(allCollected.layerStates) !== JSON.stringify(existingLayerStates);

      if (layersChanged || statesChanged) {
        hasAnyChange = true;
        console.log(`âœ… LayerPreviewNode ${node.id} æ›´æ–°:`, {
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

      // æ™‚ç³»åˆ—å–å¾—ï¼ˆãƒã‚§ãƒ¼ãƒ³ã‚’é¡ã‚‹ï¼‰
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

      ordered.reverse(); // å¤ã„ â†’ æ–°ã—ã„ ã®é †ã«

      // config ã‹ã‚‰å…¨ãƒ¬ã‚¤ãƒ¤ãƒ¼ã® zIndex ã‚’å–å¾—
      const layersConfig = node.data.editorConfig?.layers ?? {};
      
      // zå€¤ãŒæœ€ã‚‚å°ã•ã„ãƒ¬ã‚¤ãƒ¤ãƒ¼ã‚’èƒŒæ™¯ãƒ¬ã‚¤ãƒ¤ãƒ¼ã¨ã¿ãªã™
      let minZ = Infinity;
      let backgroundLayerKey = null;

      for (const [key, def] of Object.entries(layersConfig)) {
        const z = def.z ?? 0;
        if (z < minZ) {
          minZ = z;
          backgroundLayerKey = key;
        }
      }

      const layerState = {}; // æœ€æ–°ã®å„ãƒ¬ã‚¤ãƒ¤ãƒ¼ã®çŠ¶æ…‹ã‚’ä¿æŒ
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

        // èƒŒæ™¯ãƒ¬ã‚¤ãƒ¤ãƒ¼ä»¥å¤–ã®æ›´æ–°ãŒã‚ã£ãŸå ´åˆã«ã®ã¿æ–°ã—ã„ãƒ•ãƒ¬ãƒ¼ãƒ ã‚’ç”Ÿæˆ
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
    }

    return node;
  });

  // ãƒ‡ãƒãƒƒã‚°ãƒ­ã‚°
  if (hasAnyChange) {
    console.log('ðŸ”„ syncMediaNodes å®Œäº† - å¤‰æ›´ã‚ã‚Š');
  }

  return hasAnyChange ? updatedNodes : currentNodes;
};

export default syncMediaNodes;