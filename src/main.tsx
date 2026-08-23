import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DEFAULT_APPEARANCE, applyAppearance, systemPrefersDark } from './appearance';
import { load as loadAppearance } from './store/appearance';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element missing from index.html');

// Before the first paint, not in an effect after it: a reader who chose dark
// should never be shown a white page for a frame first.
applyAppearance(loadAppearance() ?? DEFAULT_APPEARANCE, systemPrefersDark());

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
