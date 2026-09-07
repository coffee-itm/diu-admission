import { useState, useEffect } from 'react';
import { Button } from './Button.jsx';
import { Languages } from 'lucide-react';

export function LanguageToggle() {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('itm-lang') || 'en';
    setLang(saved);
  }, []);

  const toggle = () => {
    const next = lang === 'en' ? 'bn' : 'en';
    setLang(next);
    localStorage.setItem('itm-lang', next);
    // In a real app, this might trigger a context update or page reload
    // window.location.reload(); 
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={toggle}
      leftIcon={<Languages size={14} />}
      title="Toggle Language (Prototype: UI structure only)"
    >
      {lang.toUpperCase()}
    </Button>
  );
}
