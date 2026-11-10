import './lib/runStorageMigration.js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';

// In-memory query cache only, per context/17 §3 (TanStack Query holds all server reads; it is not
// persisted). Clearing it on logout alongside the zustand stores (D-15, `resetAll()`) is a follow-up
// once pages actually use queries (S4+) — nothing reads through this client yet, so there is no
// query-cache leak across logins today.
const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
