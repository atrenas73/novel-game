// src/hooks/useTextStyles.js
import { useState, useEffect } from 'react'

export function useTextStyles() {
  const [textStyles, setTextStyles] = useState({})

  useEffect(() => {
    // preload経由で読み込み
    window.electronAPI.loadTextStyle()
      .then(loaded => {
        if (loaded && Object.keys(loaded).length > 0) {
          setTextStyles(loaded)
        } else {
          // デフォルト値（必要ならここで入れる）
          setTextStyles({})
        }
      })
      .catch(err => console.error('テキストスタイル読み込み失敗', err))
  }, [])

  const updateTextStyle = (styleId, newStyle) => {
    setTextStyles(prev => ({
      ...prev,
      [styleId]: {
        ...prev[styleId],
        ...newStyle
      }
    }))
  }

  const saveTextStyles = () => {
    window.electronAPI.saveTextStyle(textStyles)
      .then(() => alert('TextStyle.json を保存しました'))
      .catch(err => alert('保存に失敗しました\n' + err.message))
  }

  return {
    textStyles,
    updateTextStyle,
    saveTextStyles
  }
}