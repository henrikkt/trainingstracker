import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import { App } from './App.tsx';
import { fordereDauerhaftenSpeicherAn } from './daten/speicher.ts';
import './index.css';

// Lokale Trainingsdaten vor automatischem Löschen durch den Browser schützen (so weit möglich)
void fordereDauerhaftenSpeicherAn();

const wurzel = document.getElementById('root');
if (!wurzel) throw new Error('#root fehlt in index.html');

createRoot(wurzel).render(
  <StrictMode>
    {/* HashRouter: funktioniert auf GitHub Pages ohne 404-Umleitungen und offline aus dem Service-Worker-Cache */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
