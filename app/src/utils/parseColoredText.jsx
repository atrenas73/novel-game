// src/utils/parseColoredText.jsx
// =========================================================
// 色付きテキスト解析関数
// =========================================================

import React from 'react';

const parseColoredText = (text) => {
  if (!text) return '(空のセリフ)';

  text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

  const parts = [];
  let currentIndex = 0;

  const regex = /<color=(#[0-9A-Fa-f]{6})>(.*?)<\/color>/gi;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > currentIndex) {
      parts.push(text.slice(currentIndex, match.index));
    }

    parts.push(
      <span key={`${currentIndex}-${match[1]}`} style={{ color: match[1] }}>
        {match[2]}
      </span>
    );

    currentIndex = match.index + match[0].length;
  }

  if (currentIndex < text.length) {
    parts.push(text.slice(currentIndex));
  }

  return parts.length > 0 ? parts : text;
};

export default parseColoredText;