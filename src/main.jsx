import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </StrictMode>
);

// Après un déploiement, un onglet resté ouvert demande d'anciens fichiers qui
// n'existent plus : on recharge la page une fois pour récupérer la nouvelle version.
window.addEventListener('vite:preloadError', (event) => {
  const CLE = 'rechargement-apres-deploiement';
  let dernier = 0;
  try { dernier = Number(sessionStorage.getItem(CLE)) || 0; } catch { /* stockage indisponible */ }
  if (Date.now() - dernier < 10000) return;

  try { sessionStorage.setItem(CLE, String(Date.now())); } catch { /* stockage indisponible */ }
  event.preventDefault();
  window.location.reload();
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker non enregistré :', error);
    });
  });
}
