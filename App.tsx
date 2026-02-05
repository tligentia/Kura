
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

  // Access Level Management
  const [accessPin, setAccessPin] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const isDevMode = !window.location.hostname || window.location.hostname === 'localhost';
    // In dev mode, default to STAR to show everything, otherwise load from storage
    if (isDevMode) return 'STAR';
    return localStorage.getItem('app_access_pin') || '';
  });

  // Initialize viewMode from localStorage, defaulting to 'patient' if no history exists
  const [viewMode, setViewMode] = useState<'doctor' | 'patient'>(() => {
    if (typeof window === 'undefined') return 'patient';
    const savedMode = localStorage.getItem('app_view_mode');
    return (savedMode === 'doctor' || savedMode === 'patient') ? savedMode : 'patient';
  });

  const [isMobileView, setIsMobileView] = useState(false);

  // Persist viewMode changes
  useEffect(() => {
    localStorage.setItem('app_view_mode', viewMode);
  }, [viewMode]);

  const handleLoginSuccess = (pin: string) => {
    setIsAuth(true);
    setAccessPin(pin);
    localStorage.setItem('app_is_auth_v2', 'true');
    localStorage.setItem('app_access_pin', pin);
  };

  return (
    <>
      {!isAuth && <Security onLogin={handleLoginSuccess} />}

      <div className={!isAuth ? 'blur-md pointer-events-none select-none opacity-50' : 'animate-in fade-in duration-700'}>
        <Shell 
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isMobileView={isMobileView}
          onToggleMobileView={() => setIsMobileView(!isMobileView)}
          accessPin={accessPin}
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
