import { QueryClient } from '@tanstack/react-query';

// Single app-wide query client (context/17 §4). A plain module singleton — not looked up via
// useQueryClient() — so non-component code (useAuth's resetAll on logout, D-15) can clear it
// without requiring a <QueryClientProvider> ancestor. src/main.jsx wraps <App> with this same
// instance so what gets cleared on logout is what pages actually read through.
export const queryClient = new QueryClient();
