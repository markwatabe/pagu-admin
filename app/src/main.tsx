import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { App } from './App';

// Register service worker for PWA installability and badge support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
