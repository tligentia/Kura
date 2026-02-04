
import React, { useState, useEffect } from 'react';
import { Security } from './Plantilla/Seguridad';
import { Shell } from './Plantilla/Shell';
import { PacientIA } from './PacientIA';

export default function App() {
  const [isAuth, setIsAuth] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isDevMode = !window.location.hostname || window.location.hostname === 'localhost';
    return isDevMode || localStorage.getItem('app_is_auth_v2') === 'true';
  });

  const [apiKey, setApiKey] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('app_apikey_v2') || '';
  });

  const [viewMode, setViewMode] = useState<'doctor' | 'patient'>('doctor');
  const [isMobileView, setIsMobileView] = useState(false);

  const handleLoginSuccess = () => {
    setIsAuth(true);
    localStorage.setItem('app_is_auth_v2', 'true');
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('app_apikey_v2', key);
  };

  return (
    <>
      {!isAuth && <Security onLogin={handleLoginSuccess} />}

      <div className={!isAuth ? 'blur-md pointer-events-none select-none opacity-50' : 'animate-in fade-in duration-700'}>
        <Shell 
          apiKey={apiKey} 
          onApiKeySave={saveApiKey}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isMobileView={isMobileView}
          onToggleMobileView={() => setIsMobileView(!isMobileView)}
        >
          <PacientIA 
            viewMode={viewMode} 
            isMobileLayout={isMobileView} 
          />
        </Shell>
      </div>
    </>
  );
}
