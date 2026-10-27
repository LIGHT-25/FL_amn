import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from './App.tsx';
import { queryClient } from './api/query';
import { DialogHost } from './dialog/dialog.tsx';
import './index.css';
import Chat from './pages/Chat.tsx';
import Debugging from './pages/Debugging.tsx';
import ProjectDashboard from './pages/ProjectDashboard.tsx';
import Explore from './pages/Explore.tsx';
import PlaceholderPage from './pages/PlaceholderPage.tsx';
import Search from './pages/Search.tsx';
import AppShell from './shell/AppShell.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DialogHost />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<ProjectDashboard />} />
            <Route path="chat" element={<Chat />} />
            <Route path="explore" element={<Explore />} />
            <Route path="search" element={<Search />} />
            <Route path="debugging" element={<Debugging />} />
            <Route path="settings" element={<PlaceholderPage title="Settings" copy="Workspace settings arrive with the auth backend." />} />
            <Route path="editor" element={<Navigate to="/app" replace />} />
            <Route path="editor/:workflowId" element={<App />} />
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
