import { memo, useCallback, useState } from 'react';
import BaseNode from '../Nodes/BaseNode';

/**
 * VisualNovelExportNode - JSONプレビュー色付け（最終正解版）
 * 
 * ご指摘ありがとうございます！完全に理解しました。
 * 
 * JSON.stringify(null, 2) の実際の出力形式：
 *   {
 *     "no": 1,
 *     "type": "image",
 *     "path": "...",
 *     ...
 *   },
 * 
 * つまり：
 * - { が最初に来る（開始行）
 * - その次の行に "type": "xxx" が来る
 * 
 * 正しいロジック：
 * - { を検出したら「未確定ブロック開始」としてスタックにプッシュ（色はまだnull）
 * - 直後に "type" 行を検出したら、直前のスタックトップ（直前の{）に色を追加
 * - } を検出したら対応する{をポップしてブロック範囲確定
 * 
 * これで開始の { 行から正しくノード色が適用されます。
 */
const VisualNovelExportNode = (props) => {
  const { id, data } = props;
  const [jsonText, setJsonText] = useState('');
  const graphData = data?.getGraph?.() || { nodes: [], edges: [] };
  const { nodes, edges } = graphData;

  const TYPE_COLOR = {
    image: '#4fc3f7',
    video: '#ffb74d',
    dialogue: '#ce93d8',
    choice: '#fff176',
  };

  // チェーン走査（変更なし）
  const buildChainFromNode = (startId, visited = new Set(), counter = { v: 1 }) => {
    const result = [];
    let currentId = startId;
    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const node = nodes.find((n) => n.id === currentId);
      if (!node) break;

      if (node.type === 'LoadImageNode') {
        result.push({
          no: counter.v++,
          type: 'image',
          path: node.data?.imagePath || '',
          fileName: node.data?.fileName || '',
        });
      } else if (node.type === 'LoadVideoNode') {
        result.push({
          no: counter.v++,
          type: 'video',
          path: node.data?.videoPath || '',
          fileName: node.data?.fileName || '',
        });
      } else if (node.type === 'dialogue') {
        result.push({
          no: counter.v++,
          type: 'dialogue',
          character: node.data?.characterName || '',
          nameColor: node.data?.nameColor || '#ffffff',
          text: node.data?.dialogueText || '',
        });
      } else if (node.type === 'choice') {
        const outgoing = edges.filter((e) => e.source === currentId && ['yes', 'no'].includes(e.sourceHandle));
        const choices = outgoing.map((e) => ({
          label: e.sourceHandle === 'yes' ? 'はい' : 'いいえ',
          timeline: buildChainFromNode(e.target, new Set(visited), counter),
        }));
        result.push({
          no: counter.v++,
          type: 'choice',
          question: node.data?.question || '',
          choices,
        });
      } else if (node.type === 'characterImage') {
        result.push({
          type: 'character',
          path: node.data.imagePath,
          x: node.data.x,
          y: node.data.y,
          scale: node.data.scale,
          zIndex: node.data.zIndex,
        });
      }

      const next = edges.find((e) => e.source === currentId && !['yes', 'no'].includes(e.sourceHandle));
      currentId = next?.target;
    }
    return result;
  };

  const buildTimeline = useCallback(() => {
    const startEdge = edges.find((e) => e.source === id);
    if (!startEdge) return [];
    return buildChainFromNode(startEdge.target);
  }, [nodes, edges, id]);

  const handleBuildPreview = useCallback(() => {
    const timeline = buildTimeline();
    if (!timeline.length) {
      setJsonText('');
      return;
    }
    const json = {
      version: 1,
      createdAt: new Date().toISOString(),
      timeline,
    };
    setJsonText(JSON.stringify(json, null, 2));
  }, [buildTimeline]);

  const handleSave = useCallback(() => {
    if (!jsonText) return;
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visual_novel.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [jsonText]);

  // 色計算関数（正しい順序：{ → type の順で色を直前の{に追加）
  const computeLineColors = (lines) => {
    const colors = new Array(lines.length).fill('#e0e0e0');
    if (lines.length === 0) return colors;

    const blocks = []; // {start: number, end: number, color: string}
    const openBraces = []; // スタック: {line: number, color: string | null}

    // 1回目の走査：{ → type → } の順で処理
    let i = 0;
    while (i < lines.length) {
      const trimmed = lines[i].trim();

      // { を検出 → 未確定ブロック開始（色はまだnull）
      if (trimmed === '{' || trimmed.endsWith('{')) {
        openBraces.push({ line: i, color: null });
      }

      // type 行を検出 → 直前のスタックトップ（直前の{）に色を追加
      const typeMatch = trimmed.match(/"type":\s*"([^"]+)"/);
      if (typeMatch && openBraces.length > 0) {
        const color = TYPE_COLOR[typeMatch[1]] || '#e0e0e0';
        const top = openBraces[openBraces.length - 1];
        top.color = color; // 直前の{に色を追加
      }

      // } を検出 → 対応する{をポップしてブロック確定
      if (trimmed === '}' || trimmed === '},') {
        if (openBraces.length > 0) {
          const open = openBraces.pop();
          if (open.color) {
            blocks.push({
              start: open.line,
              end: i,
              color: open.color,
            });
          }
        }
      }

      i++;
    }

    // 2回目の走査：確定したブロック範囲に色を適用
    i = 0;
    while (i < lines.length) {
      const trimmed = lines[i].trim();

      let applied = false;
      for (const block of blocks) {
        if (i >= block.start && i <= block.end) {
          colors[i] = block.color;
          applied = true;
          break;
        }
      }

      // "no": 行は緑で上書き（最優先）
      if (trimmed.startsWith('"no":')) {
        colors[i] = '#a5d6a7';
      }

      i++;
    }

    return colors;
  };

  return (
    <BaseNode {...props}>
      <div style={{ padding: 12, fontSize: 12 }}>
        <div style={{ fontWeight: 'bold' }}>Visual Novel Export</div>
        <div className="nodrag" style={{ display: 'flex', gap: 6, margin: '6px 0' }}>
          <button onClick={handleBuildPreview}>プレビュー生成</button>
          <button onClick={handleSave} disabled={!jsonText}>保存</button>
        </div>

        <pre
          className="nodrag"
          style={{
            maxHeight: 240,
            overflow: 'auto',
            background: '#111',
            padding: 8,
            borderRadius: 4,
            fontSize: 11,
            whiteSpace: 'pre',
            fontFamily: 'monospace',
            margin: 0,
          }}
        >
          {(() => {
            if (!jsonText) return '（未生成）';
            const lines = jsonText.split('\n');
            const lineColors = computeLineColors(lines);
            return lines.map((line, i) => (
              <div key={i} style={{ color: lineColors[i] }}>
                {line || ' '}
              </div>
            ));
          })()}
        </pre>
      </div>
    </BaseNode>
  );
};

export default memo(VisualNovelExportNode);