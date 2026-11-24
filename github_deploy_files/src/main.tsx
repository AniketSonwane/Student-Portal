import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { cleanupUnnecessaryStorage } from './utils/cleanStorage';

// Purge any unnecessary, obsolete, or temporary keys from browser localStorage
cleanupUnnecessaryStorage();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
