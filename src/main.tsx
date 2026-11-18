import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import { App } from './App.tsx';
import './index.css';

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
