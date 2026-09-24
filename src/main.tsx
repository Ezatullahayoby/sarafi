// Ensure window.fetch has both getter and setter in iframe environments
(function ensureFetchSetter() {
  try {
    if (typeof window !== 'undefined') {
      const origFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : undefined;
      let _currentFetch = origFetch;
      try {
        Object.defineProperty(window, 'fetch', {
          get: () => _currentFetch,
          set: (v) => {
            _currentFetch = v;
          },
          configurable: true,
          enumerable: true,
        });
      } catch (e1) {
        if (typeof Window !== 'undefined' && Window.prototype) {
          try {
            Object.defineProperty(Window.prototype, 'fetch', {
              get: () => _currentFetch,
              set: (v) => {
                _currentFetch = v;
              },
              configurable: true,
              enumerable: true,
            });
          } catch (e2) {}
        }
      }
    }
  } catch (err) {}
})();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
