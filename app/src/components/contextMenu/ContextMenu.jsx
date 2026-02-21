// =========================================================
// コンテキストメニュー本体
// =========================================================
import MenuItem from './MenuItem';
import MenuDivider from './MenuDivider';

export default function ContextMenu({
  top,
  left,
  nodeId,
  onAddText,
  onAddDialogue,
  onAddDialoguePreview,
  onAddDialogueList,
  onAddVisualNovelExport,
  onAddVisualNovelPlayer,
  onAddImage,
  onAddVideo,
  onAddSlideshow,
  onAddVideoSlideshow,
  onAddChoice,
  onAddLayer,
  onAddLayerText,
  onAddLayerPreview,
  onAddLayerTimeline,
  onAddLayerOnOff,
  onHeaderColorChange,
  onBorderColorChange,
  onCloneNode,
  onDeleteNode,
  onDeleteEdge,
  onRename,
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        minWidth: 180,
        background: '#1e1e1e',
        border: '1px solid #444',
        borderRadius: 8,
        padding: '6px 0',
        zIndex: 1000,
        color: '#fff',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        fontSize: 13,
        userSelect: 'none',
      }}
    >
      {onAddText && <MenuItem label="✏️ テキストノード追加" onClick={onAddText} />}
      {onAddDialogue && <MenuItem label="🗨 対話ノード追加" onClick={onAddDialogue} />}
      {onAddDialoguePreview && <MenuItem label="🗨 対話プレビューノード追加" onClick={onAddDialoguePreview} />}
      {onAddDialogueList && <MenuItem label="📜 対話リストノード追加" onClick={onAddDialogueList} />}
      {onAddImage && <MenuItem label="🖼 画像ノード追加" onClick={onAddImage} />}
      {onAddLayer && <MenuItem label="🧍 レイヤー画像ノード追加" onClick={onAddLayer} />}
      {onAddLayerText && <MenuItem label="📝 レイヤーテキストノード追加" onClick={onAddLayerText} />}
      {onAddLayerPreview && <MenuItem label="🧍➕ レイヤープレビューノード追加" onClick={onAddLayerPreview} />}
      {onAddLayerTimeline && <MenuItem label="🧍➕ レイヤータイムラインノード追加" onClick={onAddLayerTimeline} />}
      {onAddLayerOnOff && <MenuItem label="👁➕ レイヤー表示制御ノード追加" onClick={onAddLayerOnOff} />}
      {onAddVideo && <MenuItem label="🎬 動画ノード追加" onClick={onAddVideo} />}
      {onAddSlideshow && <MenuItem label="📽 スライドショーノード追加" onClick={onAddSlideshow} />}
      {onAddVideoSlideshow && <MenuItem label="🎥 動画スライドショーノード追加" onClick={onAddVideoSlideshow} />}
      {onAddChoice && <MenuItem label="❓ 選択肢ノード追加" onClick={onAddChoice} />}
      {onAddVisualNovelExport && <MenuDivider />}

      {onAddVisualNovelExport && <MenuItem label="📦 ノベル保存ノード追加" onClick={onAddVisualNovelExport} /> }
      {onAddVisualNovelPlayer && <MenuItem label="📦 ノベル再生ノード追加" onClick={onAddVisualNovelPlayer} /> }
      
      {(onDeleteNode || onDeleteEdge || onHeaderColorChange || onBorderColorChange || onCloneNode) && (
        <MenuDivider />
      )}

      {nodeId && <MenuItem label="🎨 ヘッダー色変更" onClick={onHeaderColorChange} />}
      {nodeId && <MenuItem label="🖌 ボーダー色変更" onClick={onBorderColorChange} />}
      {nodeId && <MenuItem label="📋 ノードを複製" onClick={onCloneNode} />}

      {onRename && <MenuItem label="✏️ 名前変更" onClick={onRename} />}
      {onDeleteNode && <MenuItem label="🗑 ノード削除" onClick={onDeleteNode} danger />}
      {onDeleteEdge && <MenuItem label="🗑 エッジ削除" onClick={onDeleteEdge} danger />}
    </div>
  );
}