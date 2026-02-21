import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

const TextStyleContext = createContext(null);

export const TextStyleProvider = ({ children }) => {
  const [styles, setStyles] = useState({});

  const reload = useCallback(async () => {
    if (!window.electronAPI?.loadTextStyle) {
      console.warn("electronAPI.loadTextStyle が利用できません");
      return;
    }

    try {
      const data = await window.electronAPI.loadTextStyle();
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setStyles(data);
        console.log("[TextStyleContext] styles を再読み込みしました", Object.keys(data));
      } else {
        console.warn("読み込んだデータが不正です", data);
      }
    } catch (err) {
      console.error("TextStyle 読み込みエラー", err);
    }
  }, []);

useEffect(() => {
  reload(); // 初回ロード

  const unsubscribe = window.electronAPI.onTextStyleLoaded?.((newStyles) => {
    console.log('[CONTEXT] 保存通知でスタイル更新', newStyles?.Comment_Default?.font?.color);
    setStyles({ ...newStyles });
  });

  return () => unsubscribe?.();
}, [reload]);

  return (
    <TextStyleContext.Provider value={{ styles, reload }}>
      {children}
    </TextStyleContext.Provider>
  );
};

export const useTextStyles = () => {
  const ctx = useContext(TextStyleContext);
  return ctx?.styles ?? {};
};

export const useReloadTextStyles = () => {
  const ctx = useContext(TextStyleContext);
  return ctx?.reload;
};

