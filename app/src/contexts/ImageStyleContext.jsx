import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

const ImageStyleContext = createContext(null);

export const ImageStyleProvider = ({ children }) => {
  const [styles, setStyles] = useState({});

  const reload = useCallback(async () => {
    if (!window.electronAPI?.loadImageStyle) {
      console.warn("electronAPI.loadImageStyle が利用できません");
      return;
    }

    try {
      const data = await window.electronAPI.loadImageStyle();
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setStyles(data);
        console.log("[ImageStyleContext] styles を再読み込みしました", Object.keys(data));
      } else {
        console.warn("読み込んだデータが不正です", data);
      }
    } catch (err) {
      console.error("ImageStyle 読み込みエラー", err);
    }
  }, []);

useEffect(() => {
  reload(); // 初回ロード

  const unsubscribe = window.electronAPI.onImageStyleLoaded?.((newStyles) => {
    console.log('[CONTEXT] 保存通知でスタイル更新', newStyles?.Comment_Default?.font?.color);
    setStyles({ ...newStyles });
  });

  return () => unsubscribe?.();
}, [reload]);

  return (
    <ImageStyleContext.Provider value={{ styles, reload }}>
      {children}
    </ImageStyleContext.Provider>
  );
};

export const useImageStyles = () => {
  const ctx = useContext(ImageStyleContext);
  return ctx?.styles ?? {};
};

export const useReloadImageStyles = () => {
  const ctx = useContext(ImageStyleContext);
  return ctx?.reload;
};

