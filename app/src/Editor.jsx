// =========================================================
//  import 
// =========================================================
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// =========================================================
//  カスタムノード                                          
// =========================================================
import TextNode from './Nodes/TextNode';
import LoadImageNode from './Nodes/LoadImageNode';
import LoadVideoNode from './Nodes/LoadVideoNode';
import SlideShowNode from './Nodes/SlideShowNode';
import VideoSlideShowNode from './Nodes/VideoSlideShowNode';
import DialogueNode from './Nodes/DialogueNode';
import DialogueListNode from './Nodes/DialogueListNode';
import DialoguePreviewNode from './Nodes/DialoguePreviewNode';
import VisualNovelExportNode from './Nodes/VisualNovelExportNode';
import VisualNovelPlayerNode from './Nodes/VisualNovelPlayerNode';
import ChoiceNode from './Nodes/ChoiceNode';
import LayerImageNode from './Nodes/LayerImageNode';
import LayerTextNode from './Nodes/LayerTextNode';
import LayerPreviewNode from './Nodes/LayerPreviewNode';
import LayerTimelineNode from './Nodes/LayerTimelineNode';
import LayerOnOffNode from './Nodes/LayerOnOffNode'; 

// =========================================================
// 定数・定義
// =========================================================
import {
  MAX_NODE_WIDTH,
  MIN_NODE_WIDTH,
  UI_VERTICAL_PADDING,
} from './constants/uiSizes';

import { DATA_TYPES } from './constants/dataTypes';

// =========================================================
// utils
// =========================================================
import parseColoredText from './utils/parseColoredText'; // 色付きテキスト解析関数 
import syncMediaNodes from './utils/syncMediaNodes';     // メディア同期関数

import { TextStyleProvider } from './contexts/TextStyleContext';
// =========================================================
// メニューコンポーネント
// =========================================================
import ContextMenu from './components/contextMenu/ContextMenu';

// =========================================================
// App コンポーネント
//  - ReactFlow 全体の状態管理とイベント制御を担当
// =========================================================
export default function App() {

  // -------------------------------------------------------
  // 1. Hooks & 状態管理 (State / Refs)
  // -------------------------------------------------------

  // ReactFlow ラッパー DOM 参照
  //  - 画面座標 → Flow 座標変換などで使用
  const reactFlowWrapper = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);

  // ReactFlow のメイン状態
  const [nodes, setNodes] = useState([]);   // ノード一覧
  const [edges, setEdges] = useState([]);   // エッジ一覧

  // UI 状態
  const [menu, setMenu] = useState(null);               // 右クリックメニュー状態
  const [colorPicker, setColorPicker] = useState(null); // カラーピッカー状態
  const [rfInstance, setRfInstance] = useState(null);   // ReactFlow インスタンス参照

  // VideoSlideShowNode 用
  //  - 新規追加時に前回の設定を引き継ぐための保持領域
  const [lastVideoSlideshowSettings, setLastVideoSlideshowSettings] = useState({
    playbackRate: 1.0, // 再生速度
    volume: 1.0,       // 音量
  });
  
  // Config（レイヤー定義など）
  const [editorConfig, setEditorConfig] = useState(null);
  
  const structuredCloneSafe = (obj) =>
  JSON.parse(JSON.stringify(obj));
  
const serializeWorkflow = () => ({
  nodes: nodesRef.current.map((n) => ({
    id: n.id,
    type: n.type,
    // 位置関連（全部）
    position: n.position,
    positionAbsolute: n.positionAbsolute,

    // サイズ関連
    measured: n.measured,
    style: n.style,

    // データ
    data: structuredCloneSafe(n.data),
  })),
  edges: edgesRef.current.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
  })),
});


  // 画像アップロード処理 + 関連ノード同期
  //  - LoadImageNode から呼ばれる / 画像サイズに応じてノードサイズを自動調整
const handleImageUpload = async (nodeId, file) => {
  // 1. Electron に保存させる（★必須変換）
  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  const savedPath = await window.electronAPI.saveImageFile({
    buffer: Array.from(uint8), // ← これが必須
    fileName: file.name,
  });

  // 2. プレビュー用 URL（★Blob）
  const imageUrl = URL.createObjectURL(file);

  // 3. 画像サイズ取得（★file://禁止）
  const img = new Image();
  img.src = imageUrl;
  await img.decode();

  // ★ ノードサイズ計算
  const MAX_WIDTH = 300;
  const MIN_WIDTH = 120;
  const HEADER_FOOTER_HEIGHT = 60;

  let width = img.width;
  let height = img.height;

  if (width > MAX_WIDTH) {
    height = Math.round((height / width) * MAX_WIDTH);
    width = MAX_WIDTH;
  }
  if (width < MIN_WIDTH) {
    height = Math.round((height / width) * MIN_WIDTH);
    width = MIN_WIDTH;
  }

  height += HEADER_FOOTER_HEIGHT;

setNodes((nds) =>
  nds.map((n) => {
    if (n.id !== nodeId) return n;

    // ===== LayerImageNode 用 =====
    if (n.type === 'layerImage') {
      return {
        ...n,
        data: {
          ...n.data,
          layerImagePath: savedPath, // ★別キー
          imageUrl,                      // プレビュー用
        },
      };
    }

    // ===== 既存（LoadImageNode 等） =====
    return {
      ...n,
      style: {
        ...n.style,
        width,
        height,
      },
      data: {
        ...n.data,
        fileName: file.name,
        fileSize: file.size,
        imagePath: savedPath,
        imageUrl,
        imageWidth: img.width,
        imageHeight: img.height,
      },
    };
  })
);
};
  // =========================================================
  // 3. メディア（画像・動画）アップロード処理
  // =========================================================

  // 動画アップロード処理 + メディア同期
  //  - LoadVideoNode から呼ばれる / 動画メタデータからノードサイズを自動調整
  const handleVideoUpload = useCallback(async (nodeId, file) => {

    // ファイル存在チェック・動画形式チェック
    if (!file || !file.type.startsWith('video/')) {
      alert('動画ファイルを選択してください。');
      return;
    }
    const buffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(buffer);

    const savedPath = await window.electronAPI.saveVideoFile({
      buffer: Array.from(uint8),
      fileName: file.name,
    });
  
    // Blob URL 作成（一時的な動画参照）
    const videoUrl = URL.createObjectURL(file);
    const fileName = file.name;
    const fileSize = file.size;

    // メタデータ取得用 video 要素
    const video = document.createElement('video');
    video.preload = 'metadata';

    // 動画メタデータ読み込み完了時
    video.onloadedmetadata = () => {
      let width = video.videoWidth;
      let height = video.videoHeight;

      // 最大幅制限
      if (width > MAX_NODE_WIDTH) {
        height = Math.round((height / width) * MAX_NODE_WIDTH);
        width = MAX_NODE_WIDTH;
      }

      // 最小幅制限
      if (width < MIN_NODE_WIDTH) {
        height = Math.round((height / width) * MIN_NODE_WIDTH);
        width = MIN_NODE_WIDTH;
      }

      // UI（ヘッダー等）分の高さを加算
      height += UI_VERTICAL_PADDING;

      // 対象ノードの更新
      setNodes((currentNodes) => {
        const updated = currentNodes.map((node) => {
          if (node.id !== nodeId) return node;

          // 既存の Blob URL を解放
          if (node.data?.videoUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(node.data.videoUrl);
          }

          return {
            ...node,
            style: { ...node.style, width, height },
            data: {
              ...node.data,
              videoUrl,
              videoPath: savedPath,
              fileName: file.name,
              fileSize: file.size,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
            },
          };
        });

        // 関連メディアノードを再同期
        return syncMediaNodes(updated, edges);
      });
    };

    // メタデータ取得失敗時
    video.onerror = () => {
      console.error('Failed to load video metadata');
      URL.revokeObjectURL(videoUrl);
    };

    video.src = videoUrl;

  }, [edges]);
  

  // -------------------------------------------------------
  // 2. ReactFlow 基本イベントハンドラ
  // -------------------------------------------------------

  // ノード変更ハンドラ
  //  - 移動・リサイズ・削除などの変更を state に反映
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // エッジ変更ハンドラ
  //  - 接続解除・削除などの変更を state に反映
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  
  const VISUAL_NOVEL_ACCEPT_TYPES = ['image', 'video', 'dialogue'];

const onConnect = useCallback(
  (params) => {
    const sourceNode = nodesRef.current.find((n) => n.id === params.source);
    const targetNode = nodesRef.current.find((n) => n.id === params.target);
    if (!sourceNode || !targetNode) return;

    const sourceHandle = sourceNode.data.handles?.find(
      (h) => h.id === params.sourceHandle
    );
    const targetHandle = targetNode.data.handles?.find(
      (h) => h.id === params.targetHandle
    );
    if (!sourceHandle || !targetHandle) return;

    const sourceType = sourceHandle.dataType;
    const targetType = targetHandle.dataType;

    const sourceRoot = sourceNode.data?.novelRootId;
    const targetRoot = targetNode.data?.novelRootId;

    const isVisualNovelRoot =
      sourceNode.type === 'visualNovelExport';

    const isInitialConnect =
      isVisualNovelRoot &&
      !targetRoot &&
      ['image', 'video', 'dialogue'].includes(targetType);

    const isSameNovel =
      sourceRoot &&
      targetRoot &&
      sourceRoot === targetRoot;

    const canPropagateRoot =
      (sourceRoot && !targetRoot) ||
      (!sourceRoot && targetRoot);
    const bothUnassigned = !sourceRoot && !targetRoot;
    
    if (!bothUnassigned && !isInitialConnect && !isSameNovel && !canPropagateRoot) {
      alert(
        `接続できません：ノベルが異なります\n` +
        `出力: ${DATA_TYPES[sourceType]?.name || '不明'}\n` +
        `入力: ${DATA_TYPES[targetType]?.name || '不明'}`
      );
      return;
    }

    const novelRootId =
      sourceRoot ||
      targetRoot ||
      (isVisualNovelRoot ? sourceNode.id : null);

    if (novelRootId) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === sourceNode.id || n.id === targetNode.id
            ? { ...n, data: { ...n.data, novelRootId } }
            : n
        )
      );
    }

    const edgeColor =
      DATA_TYPES[sourceType]?.color ||
      DATA_TYPES.generic.color;

    setEdges((eds) => {
      const newEdges = addEdge(
        {
          ...params,
          style: { stroke: edgeColor, strokeWidth: 4 },
          animated: true,
        },
        eds
      );

      setNodes((currentNodes) =>
        syncMediaNodes(currentNodes, newEdges)
      );

      return newEdges;
    });
  },
  [setNodes, setEdges] // ← 最低限これ
);







  // =========================================================
  // 4. 初期データ定義 & ライフサイクル
  // =========================================================

  // 初期ノード定義
  const initialNodes = useMemo(
    () => [
      {
        id: 'n1',
        type: 'text',
        position: { x: 0, y: 200 },
        data: {
          label: 'テキスト',
          value: 'ここにテキストを入力してください。',
          headerColor: '#f1c40f',
          handles: [
            { id: 'input', type: 'target', position: Position.Top, dataType: 'text' },
            { id: 'output', type: 'source', position: Position.Bottom, dataType: 'text' },
          ],
          DATA_TYPES,
        },
      },
      {
        id: 'n2',
        type: 'LoadImageNode',
        position: { x: 0, y: 350 },
        data: {
          label: '画像読み込み',
          headerColor: '#4CAF50',
          borderColor: '#388E3C',
          nodeId: 'n2',
          onUpload: handleImageUpload,
          handles: [
            { id: 'input', type: 'target', position: Position.Top, dataType: 'image' },
            { id: 'output', type: 'source', position: Position.Bottom, dataType: 'image' },
          ],
          DATA_TYPES,
        },
        style: { width: 150, height: 120 },
      },
      {
        id: 'n3',
        type: 'LoadVideoNode',
        position: { x: 0, y: 520 },
        data: {
          label: '動画読み込み',
          headerColor: '#2196F3',
          borderColor: '#1976D2',
          nodeId: 'n3',
          onUpload: handleVideoUpload,
          handles: [
            { id: 'input', type: 'target', position: Position.Top, dataType: 'video' },
            { id: 'output', type: 'source', position: Position.Bottom, dataType: 'video' },
          ],
          DATA_TYPES,
        },
        style: { width: 200, height: 160 },
      },
    ],
    [handleImageUpload, handleVideoUpload]
  );

  // 初期エッジ定義（空）
  const initialEdges = useMemo(() => [], []);

  // 初回ロード処理
  useEffect(() => {
    if (nodes.length === 0 && edges.length === 0) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges]);
  
  useEffect(() => {
    if (!window.electronAPI?.loadConfig) return;

    (async () => {
      try {
        const config = await window.electronAPI.loadConfig();
        setEditorConfig(config);
      } catch (e) {
        console.error('Config 読み込み失敗', e);
      }
    })();
  }, []);
  
  const [textStyles, setTextStyles] = useState({});

  useEffect(() => {
    window.electronAPI.loadTextStyle().then(setTextStyles);
  }, []);
  // =========================================================
  // 5. 特定ノード専用コールバック (Dialogue 等)
  // =========================================================

  // キャラクター名変更
  const onDialogueNameChange = useCallback((nodeId, newName) => {
    setNodes((nds) => {
      const updated = nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, characterName: newName } } : n
      );
      return syncMediaNodes(updated, edges);
    });
  }, [edges]);

  // セリフ内容変更
  const onDialogueTextChange = useCallback((nodeId, newText) => {
    setNodes((nds) => {
      const updated = nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, dialogueText: newText } } : n
      );
      return syncMediaNodes(updated, edges);
    });
  }, [edges]);

  // 名前表示色変更
  const onDialogueNameColorChange = useCallback((nodeId, newColor) => {
    setNodes((nds) => {
      const updated = nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, nameColor: newColor } } : n
      );
      return syncMediaNodes(updated, edges);
    });
  }, [edges]);
  
  // プレビュー速度変更用
  const onPreviewSpeedChange = useCallback((nodeId, newSpeed) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, typingSpeed: newSpeed } } : n
      )
    );
  }, []);
  // 対話ノードのヘッダー名（label）変更
  const onNodeLabelChange = useCallback((nodeId, newLabel) => {
    setNodes((nds) => {
      const updated = nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n
      );
      return syncMediaNodes(updated, edges);
    });
  }, [edges]);
  // =========================================================
  // 6. コンテキストメニュー制御
  // =========================================================

  // 背景（ペイン）右クリック
  const onPaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      if (!rfInstance) return;
      const flowPosition = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setMenu({
        top: event.clientY,
        left: event.clientX,
        flowPosition,
      });
    },
    [rfInstance]
  );

  // ノード右クリック
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setMenu({ nodeId: node.id, top: event.clientY, left: event.clientX });
  }, []);

  // エッジ右クリック
  const onEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setMenu({
      edgeId: edge.id,
      top: event.clientY,
      left: event.clientX,
    });
  }, []);

// =========================================================
// ワークフロー読み込み処理（修正版）
// =========================================================
useEffect(() => {
  if (!window.electronAPI) return;
  
  // --- request-workflow-data ---
  const offRequest = window.electronAPI.onRequestWorkflowData(() => {
    const data = serializeWorkflow();
    window.electronAPI.sendWorkflowData(data);
  });

  // --- workflow-loaded ---
  const offLoaded = window.electronAPI.onWorkflowLoaded(async (data) => {
    if (!data?.nodes || !data?.edges) return;

    console.log('ワークフロー読み込み開始:', data);

    // 1. 各ノードのデータ復元（画像Blob復元 + コールバック再設定）
    const restoredNodes = await Promise.all(
      data.nodes.map(async (n) => {
        let restoredData = { ...n.data, DATA_TYPES };

        // 画像ノードの復元
        if (n.type === 'LoadImageNode' || n.type === 'layerImage') {
          restoredData.onUpload = handleImageUpload;
          restoredData.nodeId = n.id;

          const imagePath = n.type === 'layerImage' 
            ? restoredData.layerImagePath 
            : restoredData.imagePath;

          if (imagePath) {
            try {
              console.log(`画像読み込み: ${n.id} - ${imagePath}`);
              const buffer = await window.electronAPI.loadImageAsBlob(imagePath);
              const blob = new Blob([new Uint8Array(buffer)]);
              const imageUrl = URL.createObjectURL(blob);
              
              if (n.type === 'layerImage') {
                restoredData.imageUrl = imageUrl;
                restoredData.layerImagePath = imagePath;
              } else {
                restoredData.imageUrl = imageUrl;
                restoredData.imagePath = imagePath;
              }
              
              console.log(`画像復元成功: ${n.id}`, imageUrl);
            } catch (err) {
              console.error(`画像復元失敗: ${n.id}`, err);
            }
          }

          if (n.type === 'layerImage') {
            restoredData.editorConfig = editorConfig;
            restoredData.onChange = (nodeId, newData) =>
              setNodes((nds) =>
                nds.map((node) => (node.id === nodeId ? { ...node, data: newData } : node))
              );
          }
        }

        // 動画ノードの復元
        if (n.type === 'LoadVideoNode') {
          restoredData.onUpload = handleVideoUpload;
          restoredData.nodeId = n.id;
          
          if (restoredData.videoPath) {
            try {
              const buffer = await window.electronAPI.loadVideoAsBlob(restoredData.videoPath);
              const blob = new Blob([new Uint8Array(buffer)]);
              restoredData.videoUrl = URL.createObjectURL(blob);
            } catch (err) {
              console.error('動画Blob復元失敗:', err);
            }
          }
        }

        // テキストノード
        if (n.type === 'layerText') {
          restoredData.editorConfig = editorConfig;
          restoredData.onChange = (nodeId, newData) =>
            setNodes((nds) =>
              nds.map((node) => (node.id === nodeId ? { ...node, data: newData } : node))
            );
        }

        // LayerOnOffNode - 参照を設定
        if (n.type === 'layerOnOff') {
          restoredData.getAllNodes = () => nodesRef.current;
          restoredData.getAllEdges = () => edgesRef.current;
          // 既存データを保持
          if (!restoredData.layers) restoredData.layers = [];
          if (!restoredData.layerStates) restoredData.layerStates = {};
          if (!restoredData.outputLayers) restoredData.outputLayers = [];
        }

        // LayerPreviewNode
        if (n.type === 'layerPreview') {
          restoredData.getAllNodes = () => nodesRef.current;
          restoredData.getAllEdges = () => edgesRef.current;
        }

        // 対話系ノード
        if (n.type === 'dialogue') {
          restoredData.onNameChange = onDialogueNameChange;
          restoredData.onTextChange = onDialogueTextChange;
          restoredData.onNameColorChange = onDialogueNameColorChange;
          restoredData.onLabelChange = onNodeLabelChange;
        }

        if (n.type === 'dialoguePreview') {
          restoredData.onSpeedChange = onPreviewSpeedChange;
        }

        if (n.type === 'dialogueList') {
          restoredData.parseColoredText = parseColoredText;
        }

        if (n.type === 'visualNovelExport') {
          restoredData.getGraph = () => ({
            nodes: nodesRef.current,
            edges: edgesRef.current,
          });
        }

        return {
          ...n,
          position: n.position,
          positionAbsolute: n.positionAbsolute,
          measured: n.measured,
          style: n.style,
          data: restoredData
        };
      })
    );

    // 2. エッジ復元 + 色の再計算
    const restoredEdges = data.edges.map((e) => {
      const sourceNode = restoredNodes.find((node) => node.id === e.source);
      const sourceHandle = sourceNode?.data?.handles?.find((h) => h.id === e.sourceHandle);
      const dataType = sourceHandle?.dataType || 'generic';
      const edgeColor = DATA_TYPES[dataType]?.color || DATA_TYPES.generic.color;

      return {
        ...e,
        animated: true,
        style: {
          stroke: edgeColor,
          strokeWidth: 4,
        },
      };
    });

    // 3. ノードとエッジをセット
    setNodes(restoredNodes);
    setEdges(restoredEdges);

    // 4. レイヤーチェーンの構築（ノードが完全にセットされた後で実行）
    setTimeout(() => {
      // 現在のノードを取得
      setNodes((currentNodes) => {
        // LayerOnOffNodeを探す
        const layerOnOffNodes = currentNodes.filter(n => n.type === 'layerOnOff');
        if (layerOnOffNodes.length === 0) return currentNodes;

        console.log('レイヤーチェーン構築開始:', layerOnOffNodes.length);

        // 各LayerOnOffNodeに対してチェーンを構築
        const updatedNodes = currentNodes.map(node => {
          if (node.type !== 'layerOnOff') return node;

          // このノードに入力しているエッジ
          const incomingEdges = restoredEdges.filter(e => e.target === node.id);
          
          // レイヤーマップ作成
          const layerMap = new Map();

          // チェーンを辿ってレイヤーを収集
          const collectLayers = (nodeId, visited = new Set()) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);

            const currentNode = currentNodes.find(n => n.id === nodeId);
            if (!currentNode) return;

            // レイヤーノードの場合
            if (currentNode.type === 'layerImage' || currentNode.type === 'layerText') {
              const layerId = currentNode.data?.layerId || currentNode.data?.layer;
              if (layerId) {
                const layerConfig = editorConfig?.layers?.[layerId];
                if (layerConfig && !layerMap.has(layerId)) {
                  console.log(`レイヤー追加: ${layerId} from ${currentNode.id}`);
                  
                  layerMap.set(layerId, {
                    id: layerId,
                    name: layerConfig.label || layerId,
                    type: currentNode.type === 'layerImage' ? 'image' : 'text',
                    zIndex: layerConfig.z || 0,
                    nodeId: currentNode.id,
                    data: {
                      ...currentNode.data,
                      imageUrl: currentNode.data?.imageUrl,
                      layerImagePath: currentNode.data?.layerImagePath,
                    },
                    source: 'chain',
                    enabled: true
                  });
                }
              }
            }

            // さらに上流を探索
            const inputEdges = restoredEdges.filter(e => e.target === nodeId);
            inputEdges.forEach(edge => collectLayers(edge.source, visited));
          };

          // 収集開始
          incomingEdges.forEach(edge => collectLayers(edge.source));

          // Zインデックスでソート
          const sortedLayers = Array.from(layerMap.values())
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

          console.log(`Node ${node.id} 収集レイヤー:`, sortedLayers.map(l => l.id));

          // layerStatesを作成
          const layerStates = {};
          sortedLayers.forEach(layer => {
            layerStates[layer.id] = true;
          });

          // outputLayersを作成
          const outputLayers = sortedLayers.map(layer => ({
            id: layer.id,
            name: layer.name,
            type: layer.type,
            zIndex: layer.zIndex,
            enabled: true,
            config: editorConfig?.layers?.[layer.id] || {
              id: layer.id,
              type: layer.type,
              label: layer.name,
              z: layer.zIndex,
              enabled: true
            },
            visible: true,
            hasChain: true
          }));

          // 更新されたデータを返す
          return {
            ...node,
            data: {
              ...node.data,
              layers: sortedLayers,
              layerStates: layerStates,
              outputLayers: outputLayers,
              _timestamp: Date.now()
            }
          };
        });

        return updatedNodes;
      });

      // さらに遅延してLayerPreviewNodeを更新
      setTimeout(() => {
        setNodes((currentNodes) => {
          return currentNodes.map(node => {
            if (node.type !== 'layerPreview') return node;

            // 接続元のlayerOnOffノードからlayerStatesを収集
            const incomingEdges = restoredEdges.filter(e => e.target === node.id);
            const layerStates = {};

            incomingEdges.forEach(edge => {
              const sourceNode = currentNodes.find(n => n.id === edge.source);
              if (sourceNode?.type === 'layerOnOff' && sourceNode.data?.layerStates) {
                Object.assign(layerStates, sourceNode.data.layerStates);
              }
            });

            return {
              ...node,
              data: {
                ...node.data,
                inputs: {
                  ...node.data.inputs,
                  layerStates
                }
              }
            };
          });
        });
      }, 100);
    }, 100);
  });

  return () => {
    offRequest?.();
    offLoaded?.();
  };
}, [
  handleImageUpload,
  handleVideoUpload,
  onDialogueNameChange,
  onDialogueTextChange,
  onDialogueNameColorChange,
  onNodeLabelChange,
  onPreviewSpeedChange,
  editorConfig,
]);

useEffect(() => {
  nodesRef.current = nodes;
}, [nodes]);

useEffect(() => {
  edgesRef.current = edges;
}, [edges]);

// ★修正: LayerOnOffNodeからの出力をLayerImageNodeに同期（新しいEffect）
useEffect(() => {
  // layerOnOffノードを探す
  const layerOnOffNodes = nodes.filter(n => n.type === 'layerOnOff');
  if (layerOnOffNodes.length === 0) return;
  
  // 更新が必要かどうかを追跡
  let hasChanges = false;
  
  const newNodes = nodes.map(node => {
    // LayerImageNodeの場合、上流のLayerOnOffノードからデータを取得
    if (node.type === 'layerImage') {
      // このノードに入力しているエッジを探す
      const incomingEdges = edges.filter(e => e.target === node.id);
      
      // 上流のLayerOnOffノードからの出力を収集
      let upstreamVisible = true; // デフォルトは表示
      let upstreamData = null;
      
      incomingEdges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (sourceNode?.type === 'layerOnOff') {
          // LayerOnOffNodeのoutputLayersから該当レイヤーを探す
          const myLayer = sourceNode.data?.outputLayers?.find(l => l.id === node.data?.layer);
          if (myLayer) {
            upstreamVisible = myLayer.visible !== false;
            upstreamData = myLayer;
          }
        } else if (sourceNode?.data?.output) {
          // 他のノードからの出力
          upstreamData = sourceNode.data.output;
          upstreamVisible = upstreamData.visible !== false;
        }
      });
      
      // 現在の表示状態と比較
      const currentOutput = node.data?.output;
      if (!currentOutput || currentOutput.visible !== upstreamVisible) {
        hasChanges = true;
        
        // 新しいoutputデータを作成
        const newOutput = {
          ...node.data,
          visible: upstreamVisible,
          upstreamVisible: upstreamVisible,
          _timestamp: Date.now()
        };
        
        return {
          ...node,
          data: {
            ...node.data,
            output: newOutput
          }
        };
      }
    }
    return node;
  });
  
  // 変更があった場合のみsetNodesを実行
  if (hasChanges) {
    console.log('LayerImageNodeの表示状態を更新');
    setNodes(newNodes);
  }
}, [nodes, edges]); // nodesとedgesの変更を監視

// ★修正: LayerOnOffNodeからの出力をLayerPreviewNodeに同期
useEffect(() => {
  let hasChanges = false;

  const newNodes = nodes.map(node => {
    if (node.type !== 'layerPreview') return node;

    const incomingEdges = edges.filter(e => e.target === node.id);
    const visited = new Set();
    const collectedLayerNodes = [];
    const layerStates = {};
    let foundLayerOnOff = false;

    const exploreUpstream = (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const sourceNode = nodes.find(n => n.id === nodeId);
      if (!sourceNode) return;

      if (sourceNode.type === 'layerOnOff') {
        foundLayerOnOff = true;

        if (sourceNode.data?.layerStates) {
          Object.assign(layerStates, sourceNode.data.layerStates);
        } else if (Array.isArray(sourceNode.data?.outputLayers)) {
          sourceNode.data.outputLayers.forEach(layer => {
            if (layer?.id) layerStates[layer.id] = layer.visible !== false;
          });
        }
      }

      if (sourceNode.type === 'layerImage' || sourceNode.type === 'layerText') {
        collectedLayerNodes.push(sourceNode);
      }

      const inputEdges = edges.filter(e => e.target === nodeId);
      inputEdges.forEach(edge => exploreUpstream(edge.source));
    };

    incomingEdges.forEach(edge => exploreUpstream(edge.source));

    // 要件: 上流にOnOffがない場合は全OFF
    const visibleLayers = !foundLayerOnOff
      ? []
      : collectedLayerNodes
          .map(n => {
            const layerId = n.data?.layerId || n.data?.layer;
            if (!layerId) return null;

            const isVisible = layerStates[layerId] !== false;
            if (!isVisible) return null;

            const layerConfig = editorConfig?.layers?.[layerId] || {};

            return {
              id: layerId,
              name: layerConfig.label || n.data?.label || layerId,
              type: n.type === 'layerImage' ? 'image' : 'text',
              zIndex: layerConfig.z || n.data?.zIndex || 0,
              nodeId: n.id,
              data: {
                ...n.data,
                imageUrl: n.data?.imageUrl,
                text: n.data?.text,
                displayX: n.data?.displayX,
                displayY: n.data?.displayY,
                displayWidth: n.data?.displayWidth,
                displayHeight: n.data?.displayHeight,
                opacity: n.data?.opacity,
                blendMode: n.data?.blendMode,
                layerConfig: layerConfig
              },
              source: 'chain',
              sourceNodeId: n.id,
              visible: true
            };
          })
          .filter(l => l !== null)
          .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    const currentStates = node.data?.inputs?.layerStates || {};
    const currentLayers = node.data?.layers || [];

    if (
      JSON.stringify(currentStates) !== JSON.stringify(layerStates) ||
      JSON.stringify(currentLayers) !== JSON.stringify(visibleLayers)
    ) {
      hasChanges = true;

      return {
        ...node,
        data: {
          ...node.data,
          inputs: {
            ...node.data.inputs,
            layerStates
          },
          layers: visibleLayers,
          layerStates: layerStates
        }
      };
    }

    return node;
  });

  if (hasChanges) {
    console.log('LayerPreviewNode 表示状態更新');
    setNodes(newNodes);
  }
}, [nodes, edges, editorConfig]); // editorConfigを依存配列に追加

  // -------------------------------------------------------
  // メニューアクション実行関数
  // -------------------------------------------------------

  // ノード名の編集開始
  const renameNodeFromMenu = useCallback(() => {
    if (!menu?.nodeId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === menu.nodeId ? { ...n, data: { ...n.data, startEdit: true } } : n
      )
    );
    setMenu(null);
  }, [menu]);

  // エッジ削除
  const deleteEdgeFromMenu = useCallback(() => {
    if (!menu?.edgeId) return;
    setEdges((eds) => eds.filter((e) => e.id !== menu.edgeId));
    setMenu(null);
  }, [menu]);

  // ノード削除
const deleteNodeFromMenu = useCallback(() => {
  if (!menu?.nodeId) return;

  const deletingNode = nodes.find((n) => n.id === menu.nodeId);

  setNodes((nds) => {
    let newNodes = nds.filter((n) => n.id !== menu.nodeId);

    // ★追加：削除したノードが visualNovelExport だった場合、
    //    その novelRootId を持っている全ノードから novelRootId を削除
    if (deletingNode?.type === 'visualNovelExport') {
      const rootIdToClear = deletingNode.data.novelRootId || deletingNode.id;
      newNodes = newNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          novelRootId: node.data.novelRootId === rootIdToClear 
            ? undefined  // クリア
            : node.data.novelRootId,
        },
      }));
    }

    return syncMediaNodes(newNodes, edges);
  });

  // エッジも削除
  setEdges((eds) =>
    eds.filter((e) => e.source !== menu.nodeId && e.target !== menu.nodeId)
  );

  setMenu(null);
}, [menu, nodes, edges]);

  // ノード複製
  const cloneNodeFromMenu = useCallback(() => {
    if (!menu?.nodeId) return;

    const originalNode = nodes.find((n) => n.id === menu.nodeId);
    if (!originalNode) return;

    const newId = `${originalNode.type}_${Date.now()}`;
    const offsetX = 50;
    const offsetY = 50;

    const clonedNode = {
      ...originalNode,
      id: newId,
      position: {
        x: originalNode.position.x + offsetX,
        y: originalNode.position.y + offsetY,
      },
      data: { ...originalNode.data },
    };

    setNodes((nds) => [...nds, clonedNode]);
    setMenu(null);
  }, [menu, nodes]);
  
  const handleBackgroundResolved = useCallback((nodeId, size) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              width: size.width,
              height: size.height,
              style: {
                ...n.style,
                width: size.width,
                height: size.height,
              },
            }
          : n
      )
    );
  }, []);

  // =========================================================
  // 7. UI カラーピッカー制御
  // =========================================================

  // ヘッダー色ピッカーを開く
  const openHeaderColorPicker = useCallback(() => {
    if (!menu?.nodeId) return;
    const currentColor = nodes.find((n) => n.id === menu.nodeId)?.data?.headerColor || '#3a8ee6';
    setColorPicker({
      type: 'header',
      nodeId: menu.nodeId,
      top: menu.top + 30,
      left: menu.left,
      currentColor,
    });
    setMenu(null);
  }, [menu, nodes]);

  // 枠線色ピッカーを開く
  const openBorderColorPicker = useCallback(() => {
    if (!menu?.nodeId) return;
    const currentColor = nodes.find((n) => n.id === menu.nodeId)?.data?.borderColor || '#1a192b';
    setColorPicker({
      type: 'border',
      nodeId: menu.nodeId,
      top: menu.top + 30,
      left: menu.left,
      currentColor,
    });
    setMenu(null);
  }, [menu, nodes]);

  // 選択された色をノードに適用
const applyColor = useCallback((color) => {
  if (!colorPicker) return;
  setNodes((nds) => {
    const updated = nds.map((n) =>
      n.id === colorPicker.nodeId
        ? {
            ...n,
            data: {
              ...n.data,
              [colorPicker.type === 'header' ? 'headerColor' : 'borderColor']: color,
            },
          }
        : n
    );
    // ← ここに追加：ヘッダー色変更時に同期を強制実行
    return syncMediaNodes(updated, edges);
  });
  setColorPicker(null);
}, [colorPicker, edges]);

  // =========================================================
  // 8. ノード追加ロジック (Factory Functions)
  // =========================================================

  // テキストノード追加
/*  const addTextNodeFromMenu = useCallback(() => {
    if (!menu?.flowPosition) return;
    setNodes((nds) => [
      ...nds,
      {
        id: `node_${Date.now()}`,
        type: 'textUpdater',
        position: menu.flowPosition,
        data: {
          label: 'テキスト',
          value: 'ここにテキストを入力してください。',
          headerColor: '#f1c40f',
          handles: [
            { id: 'input', type: 'target', position: Position.Top, dataType: 'text' },
            { id: 'output', type: 'source', position: Position.Bottom, dataType: 'text' }, 
          ],
          DATA_TYPES,
        },
      },
    ]);
    setMenu(null);
  }, [menu]);
*/
  // 対話ノード追加
  const addDialogueNodeFromMenu = useCallback(() => {
    if (!menu?.flowPosition) return;
    const id = `dialogue_${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'dialogue',
        position: menu.flowPosition,
        data: {
          label: '対話',
          headerColor: '#9c27b0',
          borderColor: '#7b1fa2',
          characterName: 'キャラクター',
          dialogueText: 'ここにセリフを入力してください。',
          nameColor: '#ffccaa',
          onNameChange: onDialogueNameChange,
          onTextChange: onDialogueTextChange,
          onNameColorChange: onDialogueNameColorChange,
          onLabelChange: onNodeLabelChange,
          handles: [
            { id: 'input', type: 'target', position: Position.Top, dataType: 'dialogue' },
            { id: 'output', type: 'source', position: Position.Bottom, dataType: 'dialogue' },
          ],
          DATA_TYPES,
        },
        style: { width: 320, height: 240 },
      },
    ]);
    setMenu(null);
  }, [menu, onNodeLabelChange]);
  
  // 対話プレビューノード追加
  const addDialoguePreviewNodeFromMenu = useCallback(() => {
    if (!menu?.flowPosition) return;
    const id = `preview_${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'dialoguePreview',
        position: menu.flowPosition,
        data: {
          label: 'プレビュー',
          headerColor: '#607d8b',
          borderColor: '#455a64',
          characterName: '',
          dialogueText: '',
          typingSpeed: 50,
          onSpeedChange: onPreviewSpeedChange, // 追加
          handles: [
            { id: 'input', type: 'target', position: Position.Top, dataType: 'dialogue' },
          ],
          DATA_TYPES,
        },
        style: { width: 300, height: 220 },
      },
    ]);
    setMenu(null);
  }, [menu, onPreviewSpeedChange]);
  
  // 対話リストノード追加
  const addDialogueListNodeFromMenu = useCallback(() => {
    if (!menu?.flowPosition) return;
    const id = `dialoguelist_${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'dialogueList',
        position: menu.flowPosition,
        data: {
          label: '対話リスト',
          headerColor: '#e91e63',
          borderColor: '#c2185b',
          dialogues: [],
          parseColoredText,
          handles: [
            { id: 'input', type: 'target', position: Position.Top, dataType: 'dialogue' },
            { id: 'output', type: 'source', position: Position.Bottom, dataType: 'dialogueList' }, 
          ],
          DATA_TYPES,
        },
        style: { width: 400, height: 420 },
      },
    ]);
    setMenu(null);
  }, [menu]);

  // 画像読み込みノード追加
  const addNodeFromMenu = useCallback(() => {
    if (!menu?.flowPosition) return;
    const id = `node_${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'LoadImageNode',
        position: menu.flowPosition,
        data: {
          label: '画像読み込み',
          headerColor: DATA_TYPES.image.color,
          borderColor: DATA_TYPES.image.color,
          nodeId: id,
          onUpload: handleImageUpload,
          handles: [
            { id: 'input', type: 'target', position: Position.Top, dataType: 'image' },
            { id: 'output', type: 'source', position: Position.Bottom, dataType: 'image' }, 
          ],
          DATA_TYPES,
        },
        style: { width: 150, height: 120 },
      },
    ]);
    setMenu(null);
  }, [menu, handleImageUpload]);

  // 動画読み込みノード追加
  const addVideoNodeFromMenu = useCallback(() => {
    if (!menu?.flowPosition) return;
    const id = `node_${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'LoadVideoNode',
        position: menu.flowPosition,
        data: {
          label: '動画読み込み',
          headerColor: '#2196F3',
          borderColor: '#1976D2',
          nodeId: id,
          onUpload: handleVideoUpload,
          handles: [
            { id: 'input', type: 'target', position: Position.Top, dataType: 'video' },
            { id: 'output', type: 'source', position: Position.Bottom, dataType: 'video' }, 
          ],
          DATA_TYPES,
        },
        style: { width: 200, height: 160 },
      },
    ]);
    setMenu(null);
  }, [menu, handleVideoUpload]);

  // スライドショーノード追加
  const addSlideshowNodeFromMenu = useCallback(() => {
    if (!menu?.flowPosition) return;
    const id = `slideshow_${Date.now()}`;

    const handleTransitionChange = (nodeId, newInterval) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, transitionInterval: newInterval } }
            : n
        )
      );
    };
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'SlideShowNode',
        position: menu.flowPosition,
        data: {
          label: 'スライドショー',
          headerColor: '#FF9800',
          borderColor: '#F57C00',
          images: [],
          inputCount: 5,
          transitionInterval: 5000,
          onTransitionChange: handleTransitionChange,
          handles: [
            { id: 'input', type: 'target', position: Position.Top, dataType: 'image' },           
            { id: 'output', type: 'source', position: Position.Bottom, dataType: 'image' }, 
          ],
          DATA_TYPES,
        },
        style: { width: 380, height: 420 },
      },
    ]);
    setMenu(null);
  }, [menu]);

  // 動画スライドショーノード追加
  const addVideoSlideshowNodeFromMenu = useCallback(() => {
    if (!menu?.flowPosition) return;

    const id = `video_slideshow_${Date.now()}`;

    // 内部関数：再生スピード変更
    const handlePlaybackRateChange = (nodeId, rate) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, playbackRate: rate } }
            : n
        )
      );
      setLastVideoSlideshowSettings((prev) => ({ ...prev, playbackRate: rate }));
    };

    // 内部関数：音量変更
    const handleVolumeChange = (nodeId, volume) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, volume } }
            : n
        )
      );
      setLastVideoSlideshowSettings((prev) => ({ ...prev, volume }));
    };

    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'VideoSlideShowNode',
        position: menu.flowPosition,
        data: {
          label: '動画スライドショー',
          headerColor: '#FF5722',
          borderColor: '#E64A19',
          videos: [],
          playbackRate: lastVideoSlideshowSettings.playbackRate,
          volume: lastVideoSlideshowSettings.volume,
          onPlaybackRateChange: handlePlaybackRateChange,
          onVolumeChange: handleVolumeChange,
          handles: [
            { id: 'input', type: 'target', position: Position.Top, dataType: 'video' },
            { id: 'output', type: 'source', position: Position.Bottom, dataType: 'video' },
          ],
          DATA_TYPES,
        },
        style: { width: 420, height: 480 },
      },
    ]);

    setMenu(null);
  }, [menu, setNodes, lastVideoSlideshowSettings]);
  
  // ===============================
  // VisualNovelExportNode
  // ===============================
  const addVisualNovelExportNode = useCallback(() => {
    if (!menu?.flowPosition) return;
    
  const exportId = `vn_export_${Date.now()}`;
  
    setNodes((nds) => [
      ...nds,
      {
        id: exportId,
        type: 'visualNovelExport',
        position: menu.flowPosition,
        data: {
          label: 'ノベル出力',
          getGraph: () => ({
            nodes: nodesRef.current,
            edges: edgesRef.current,
          }),
          novelRootId: exportId,
          handles: [
            { id: 'output', type: 'source', position: Position.Bottom, dataType: 'visualNovel' },
          ],
          DATA_TYPES,
        },
      },
    ]);
    setMenu(null);
  }, [menu, nodes, edges]);
  
  // ===============================
  // addVisualNovelPlayerNode
  // ===============================
  const addVisualNovelPlayerNode = useCallback(() => {
    if (!menu?.flowPosition) return;

    const id = `vn_player_${Date.now()}`;

    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'visualNovelPlayer',
        position: menu.flowPosition,
        data: {
          label: 'ノベル再生',
          timeline: [],
          onBackgroundResolved: (size) =>
            handleBackgroundResolved(id, size),
        },
        style: { width: 320, height: 240 }, // ★ 初期サイズ必須
      },
    ]);
    setMenu(null);
  }, [menu, handleBackgroundResolved]);
  
const addChoiceNodeFromMenu = useCallback(() => {
  if (!menu?.flowPosition) return;

  const id = `choice_${Date.now()}`;

  setNodes((nds) => [
    ...nds,
    {
      id,
      type: 'choice',
      position: menu.flowPosition,
      data: {
        label: '選択肢',
        type: 'choice',
        question: '',
        headerColor: DATA_TYPES.choice.color,
        borderColor: DATA_TYPES.choice.color,
        handles: [
          {
            id: 'input',
            type: 'target',
            position: Position.Top,
            dataType: 'choice',
          },
          {
            id: 'yes',
            type: 'source',
            position: Position.Bottom,
            dataType: 'choice',
            offset: 0.25,
          },
          {
            id: 'no',
            type: 'source',
            position: Position.Bottom,
            dataType: 'choice',
            offset: 0.75,
          },
        ],
        onChange: (newData) => {
          setNodes((nodes) =>
            nodes.map((n) =>
              n.id === id ? { ...n, data: newData } : n
            )
          );
        },
      },
    },
  ]);

  setMenu(null);
}, [menu]);

const addLayerImageNode = useCallback(() => {
  if (!menu?.flowPosition) return;

  const id = `layer_${Date.now()}`;

  // ===== canvas サイズを config から取得 =====
  const canvasW = editorConfig?.canvas?.width ?? 1280;
  const canvasH = editorConfig?.canvas?.height ?? 720;

  // ノードUI分の高さ（操作パネル分）
  const NODE_UI_HEIGHT = 180;

  setNodes((nds) => [
    ...nds,
    {
      id,
      type: 'layerImage',
      position: menu.flowPosition,
      data: {
        label: 'レイヤー画像',
        nodeId: id,
        headerColor: DATA_TYPES.image.color,
        borderColor: DATA_TYPES.image.color,

        // ===== 既存処理 =====
        onUpload: handleImageUpload,
        onChange: (nodeId, newData) =>
          setNodes((nds) =>
            nds.map((n) =>
              n.id === nodeId ? { ...n, data: newData } : n
            )
          ),

        // ===== Config 注入（最重要） =====
        editorConfig,

        // 初期レイヤー（最前面でもOK）
        layer: 'image_main',

        // ===== レイヤー画像データ =====
        layerImagePath: null,
        imageUrl: null,
        x: 0,
        y: 0,
        scale: 1,

        // ===== handles =====
        handles: [
          {
            id: 'input',
            type: 'target',
            position: Position.Top,
            dataType: 'layer',
          },
          {
            id: 'output',
            type: 'source',
            position: Position.Bottom,
            dataType: 'layer',
          },
        ],

        DATA_TYPES,
      },
      style: {
        width: 'auto',
        height: 'auto',
      },
    },
  ]);

  setMenu(null);
}, [menu, handleImageUpload, editorConfig]);

const addLayerTextNodeFromMenu = useCallback(() => {
  if (!menu?.flowPosition) return;

  const id = `layer_text_${Date.now()}`;
  const canvasW = editorConfig?.canvas?.width ?? 1280;
  const canvasH = editorConfig?.canvas?.height ?? 720;
  const NODE_UI_HEIGHT = 220; // 少し高めに（入力欄が多いため）

  setNodes((nds) => [
    ...nds,
    {
      id,
      type: 'layerText',
      position: menu.flowPosition,
      data: {
        label: 'レイヤーテキスト',
        nodeId: id,
        headerColor: '#9c27b0',       // テキスト系らしい紫系
        borderColor: '#7b1fa2',

        // Config 注入（必須）
        editorConfig,

        // テキスト関連初期値
        text: 'ここに表示したいテキストを入力してください',
        characterName: 'ナレーター',
        font: editorConfig?.text?.font ?? "'Noto Sans JP', 'Yu Gothic', sans-serif",
        fontSize: editorConfig?.text?.size ?? 28,
        textColor: editorConfig?.text?.color ?? '#e0e0ff',
        nameColor: editorConfig?.text?.nameColor ?? '#ffcc99',
        textAlign: 'left',
        verticalAlign: 'bottom',

        // ボックススタイル（半透明風）
        boxBackground: 'rgba(0,0,30,0.65)',
        boxBorderColor: '#6666aa',
        padding: 24,

        // 位置初期値（右下寄せが一般的）
        x: 20,
        y: canvasH-20,

        // コールバック
        onChange: (nodeId, newData) =>
          setNodes((nds) =>
            nds.map((n) => (n.id === nodeId ? { ...n, data: newData } : n))
          ),

        // handles（layerImage や layerTimeline と同一系統）
        handles: [
          {
            id: 'input',
            type: 'target',
            position: Position.Top,
            dataType: 'layer',
          },
          {
            id: 'output',
            type: 'source',
            position: Position.Bottom,
            dataType: 'layer',
          },
        ],

        DATA_TYPES,
      },
      style: {
        width: 'auto',
        height: 'auto',
      },
    },
  ]);

  setMenu(null);
}, [menu, editorConfig]);

const addLayerTimelineNode = useCallback(() => {
  if (!menu?.flowPosition) return;

  const id = `layer_timeline_${Date.now()}`;
  const NODE_UI_HEIGHT = 180;

  const canvasW = editorConfig?.canvas?.width ?? 1280;
  const canvasH = editorConfig?.canvas?.height ?? 720;

  setNodes((nds) => [
    ...nds,
    {
      id,
      type: 'layerTimeline',
      position: menu.flowPosition,
      data: {
        label: 'レイヤータイムライン',
        nodeId: id,

        headerColor: '#795548',
        borderColor: '#5d4037',

        // ★ 必須
        editorConfig,

        // ★ sync が上書きする前提
        frames: [],
        intervalMs: 800,

        handles: [
          {
            id: 'input',
            type: 'target',
            position: Position.Top,
            dataType: 'layer', // ← image → layer
          },
          {
            id: 'output',
            type: 'source',
            position: Position.Bottom,
            dataType: 'layer',
          },
        ],

        DATA_TYPES,
      },
      style: {
        width: canvasW,
        height: canvasH + NODE_UI_HEIGHT,
      },
    },
  ]);

  setMenu(null);
}, [menu, editorConfig]);

const addTextNodeFromMenu = useCallback(() => {
  if (!menu?.flowPosition) return;

  const id = `text_${Date.now()}`;

  setNodes((nds) => [
    ...nds,
    {
      id,
      type: 'text',
      position: menu.flowPosition,
      data: {
        label: DATA_TYPES.text.name,
        nodeId: id,
        headerColor: DATA_TYPES.text.color,
        borderColor: DATA_TYPES.text.color,
        // ★ テキスト本体
        text: '',

        // ★ TextStyle.json から選択する
        styleId: '',
        layer: 'text_main',
        // 再生制御（最低限）
        waitForInput: false,
        autoAdvanceDelay: 0,
        editorConfig: editorConfig,
        // コールバック
        onChange: (nodeId, newData) =>
          setNodes((nds) =>
            nds.map((n) => (n.id === nodeId ? { ...n, data: newData } : n))
          ),

        // handles（layerImage や layerTimeline と同一系統）
        handles: [
          {
            id: 'input',
            type: 'target',
            position: Position.Top,
            dataType: 'layer',
          },
          {
            id: 'output',
            type: 'source',
            position: Position.Bottom,
            dataType: 'layer',
          },
        ],

        DATA_TYPES,
      },
    },
  ]);

  setMenu(null);
}, [menu, editorConfig]);

const addLayerOnOffNodeFromMenu = useCallback(() => {
  if (!menu?.flowPosition) return;

  const id = `layer_onoff_${Date.now()}`;

  setNodes((nds) => [
    ...nds,
    {
      id,
      type: 'layerOnOff',
      position: menu.flowPosition,
      data: {
        label: 'レイヤー表示制御',
        nodeId: id,
        headerColor: '#4CAF50',
        borderColor: '#388E3C',
        
        // 全ノードとエッジへの参照を渡す
        getAllNodes: () => nodesRef.current,
        getAllEdges: () => edgesRef.current,
        
        handles: [
          {
            id: 'input',
            type: 'target',
            position: Position.Top,
            dataType: 'layer',
          },
          {
            id: 'output',
            type: 'source',
            position: Position.Bottom,
            dataType: 'layer',
          },
        ],
        
        DATA_TYPES,
          onChange: (newData) => {
          setNodes((current) => {
            const updated = current.map((n) =>
              n.id === id ? { ...n, data: newData } : n
            );
            return syncMediaNodes(updated, edgesRef.current || []);
          });
        },
      },
      style: {
        width: 'auto',
        height: 'auto',
      },
    },
  ]);

  setMenu(null);
}, [menu]);

const addLayerPreviewNodeFromMenu = useCallback(() => {
  if (!menu?.flowPosition) return;

  const id = `layer_preview_${Date.now()}`;

  setNodes((nds) => [
    ...nds,
    {
      id,
      type: 'layerPreview',
      position: menu.flowPosition,
      data: {
        label: 'レイヤープレビュー',
        nodeId: id,
        headerColor: '#9C27B0',
        borderColor: '#7B1FA2',
        
        getAllNodes: () => nodesRef.current,
        getAllEdges: () => edgesRef.current,
        
        handles: [
          {
            id: 'input',
            type: 'target',
            position: Position.Top,
            dataType: 'layer',
          },
          {
            id: 'output',
            type: 'source',
            position: Position.Bottom,
            dataType: 'preview',
          },
        ],
        
        DATA_TYPES,
      },
      style: {
        width: 'auto',
        height: 'auto',
      },
    },
  ]);

  setMenu(null);
}, [menu]);

  // =========================================================
  // 9. レンダリング構成定義
  // =========================================================

  // カスタムノード型のマッピング
  const nodeTypes = {
    text: TextNode,
    LoadImageNode,
    LoadVideoNode,
    SlideShowNode,
    VideoSlideShowNode,
    dialogue: DialogueNode,
    dialoguePreview: DialoguePreviewNode,
    dialogueList: DialogueListNode,
    visualNovelExport: VisualNovelExportNode,
    visualNovelPlayer: VisualNovelPlayerNode,
    choice: ChoiceNode,
    layerImage: LayerImageNode,
    layerText: LayerTextNode,
    layerTimeline: LayerTimelineNode,
    layerPreview: LayerPreviewNode,
    layerOnOff: LayerOnOffNode,
  };

  // メイン UI レンダリング
  return (
    <div ref={reactFlowWrapper} style={{ width: '100vw', height: '100vh', background: '#444' }}>
     <TextStyleProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setRfInstance}
          onPaneClick={() => setMenu(null)}  // ← colorPickerのnull削除（これが移動の原因だった！！）
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </TextStyleProvider>
      {/* コンテキストメニュー表示 */}
      {menu && (
        <ContextMenu
          top={menu.top}
          left={menu.left}
          nodeId={menu.nodeId}
          onAddVisualNovelExport={addVisualNovelExportNode}
          onAddVisualNovelPlayer={addVisualNovelPlayerNode}
          onAddText={!menu.nodeId && !menu.edgeId ? addTextNodeFromMenu : undefined}
          onAddDialogue={!menu.nodeId && !menu.edgeId ? addDialogueNodeFromMenu : undefined}
          onAddDialoguePreview={!menu.nodeId && !menu.edgeId ? addDialoguePreviewNodeFromMenu : undefined}
          onAddDialogueList={!menu.nodeId && !menu.edgeId ? addDialogueListNodeFromMenu : undefined}
          onAddImage={!menu.nodeId && !menu.edgeId ? addNodeFromMenu : undefined}
          onAddVideo={!menu.nodeId && !menu.edgeId ? addVideoNodeFromMenu : undefined}
          onAddSlideshow={!menu.nodeId && !menu.edgeId ? addSlideshowNodeFromMenu : undefined}
          onAddVideoSlideshow={!menu.nodeId && !menu.edgeId ? addVideoSlideshowNodeFromMenu : undefined}
          onAddChoice={addChoiceNodeFromMenu}
          onAddLayer={addLayerImageNode}
          onAddLayerText={addLayerTextNodeFromMenu}
          onAddLayerTimeline={!menu.nodeId && !menu.edgeId ? addLayerTimelineNode : undefined}
          onAddLayerPreview={!menu.nodeId && !menu.edgeId ? addLayerPreviewNodeFromMenu : undefined}
          onAddLayerOnOff={!menu.nodeId && !menu.edgeId ? addLayerOnOffNodeFromMenu : undefined}
          onHeaderColorChange={menu.nodeId ? openHeaderColorPicker : undefined}
          onBorderColorChange={menu.nodeId ? openBorderColorPicker : undefined}
          onCloneNode={menu.nodeId ? cloneNodeFromMenu : undefined}
          onRename={menu.nodeId ? renameNodeFromMenu : undefined}
          onDeleteNode={menu.nodeId ? deleteNodeFromMenu : undefined}
          onDeleteEdge={menu.edgeId ? deleteEdgeFromMenu : undefined}
        />
      )}

      {/* カラーピッカー表示 */}
      {colorPicker && (
        <div
          style={{
            position: 'absolute',
            top: colorPicker.top,
            left: colorPicker.left,
            background: '#1e1e1e',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
            zIndex: 100000,
            border: '1px solid #444',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <div style={{ color: '#fff', fontSize: '14px', marginBottom: '12px', fontWeight: 'bold' }}>
            {colorPicker.type === 'header' ? 'ヘッダー色を選択' : 'ボーダー色を選択'}
          </div>
          <input
            type="color"
            value={colorPicker.currentColor}
            onChange={(e) => applyColor(e.target.value)}
            style={{
              width: '140px',
              height: '100px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          />
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <span style={{ color: '#aaa', fontSize: '12px' }}>現在の色: </span>
            <span style={{ color: '#fff', fontWeight: 'bold' }}>{colorPicker.currentColor}</span>
          </div>
          <button
            onClick={() => setColorPicker(null)}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '8px',
              background: '#444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}