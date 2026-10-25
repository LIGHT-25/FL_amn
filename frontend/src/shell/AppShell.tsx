import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppShell() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-ink">
      <Sidebar open={open} onToggle={() => setOpen((o) => !o)} />
      {/* The canvas editor fills the shell content area instead of the viewport. */}
      <main className="min-w-0 flex-1 overflow-y-auto [&>.app]:h-full">
        <Outlet />
      </main>
    </div>
  );
}
