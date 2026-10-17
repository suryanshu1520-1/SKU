import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  // Clear any static pre-render placeholder inside #root so React mounts cleanly
  // without creating a duplicate sibling block in the crawlable/rendered DOM
  rootEl.innerHTML = '';
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

