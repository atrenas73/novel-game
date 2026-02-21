// =========================================================
// コンテキストメニュー用 1項目コンポーネント
// =========================================================
export default function MenuItem({ label, onClick, danger }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '6px 14px',
        cursor: 'pointer',
        color: danger ? '#ff6b6b' : '#eee',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? 'rgba(255,107,107,0.15)'
          : 'rgba(255,255,255,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {label}
    </div>
  );
}