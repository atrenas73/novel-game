export function textStyleToInputCSS(style) {
  if (!style) return {};

  const font = style.font ?? {};
  const box = style.box ?? {};
  const layout = style.layout ?? {};

  const isInvisible =
    font.color === '#ffffff' && box.enabled === false;

  return {
    fontFamily: font.family,
    fontSize: font.size ? `${font.size}px` : undefined,
    color: font.color,
    lineHeight: font.lineHeight ?? 1.4,
    fontWeight: font.bold ? 'bold' : 'normal',
    fontStyle: font.italic ? 'italic' : 'normal',
    textDecoration: font.strike ? 'line-through' : 'none',

    padding: layout.padding != null
      ? `${layout.padding}px`
      : undefined,

    background: box.enabled
      ? box.background
      : isInvisible
        ? 'rgba(0,0,0,0.05)'   // ★ エディター救済
        : 'transparent',

    border: box.enabled
      ? `${box.borderWidth ?? 1}px solid ${box.borderColor ?? '#666'}`
      : '1px dashed rgba(0,0,0,0.3)',  // ★ 編集中だと分かる

    borderRadius: box.borderRadius
      ? `${box.borderRadius}px`
      : undefined,

    whiteSpace: 'pre-wrap',
  };
}

