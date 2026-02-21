import { useEffect, useState } from 'react';
import Editor from './Editor';
import TextStyleEditor from './Editors/TextStyleEditor';
import ImageStyleEditor from './Editors/ImageStyleEditor'; // ← 新規追加（後で作成）

function App() {
  const [hash, setHash] = useState(() => window.location.hash || '#/');

  // TextStyle 用状態
  const [currentTextStyle, setCurrentTextStyle] = useState({});
  // ImageStyle 用状態（新規追加）
  const [currentImageStyle, setCurrentImageStyle] = useState({});

  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  // ハッシュが変わったらスタイルを再読み込み
  useEffect(() => {
    if (hash === '#/text-style-editor') {
      window.electronAPI.loadTextStyle()
        .then(styles => {
          const firstKey = Object.keys(styles)[0];
          if (firstKey) {
            setCurrentTextStyle(styles[firstKey]);
          }
        })
        .catch(err => console.error('[App] TextStyle load error', err));
    }

    if (hash === '#/image-style-editor') {
      window.electronAPI.loadImageStyle() // ← ImageStyle 読み込み
        .then(styles => {
          const firstKey = Object.keys(styles)[0];
          if (firstKey) {
            setCurrentImageStyle(styles[firstKey]);
          }
        })
        .catch(err => console.error('[App] ImageStyle load error', err));
    }
  }, [hash]);

  const handleTextStyleChange = (newStyle) => {
    setCurrentTextStyle(newStyle);
  };

  const handleImageStyleChange = (newStyle) => {
    setCurrentImageStyle(newStyle);
  };

  if (hash === '#/text-style-editor') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <TextStyleEditor
          style={currentTextStyle}
          onChange={handleTextStyleChange}
          canvas={{ width: 1280, height: 720 }}
        />
      </div>
    );
  }

  if (hash === '#/image-style-editor') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <ImageStyleEditor
          style={currentImageStyle}
          onChange={handleImageStyleChange}
          canvas={{ width: 1280, height: 720 }}
        />
      </div>
    );
  }

  return <Editor />;
}

export default App;
