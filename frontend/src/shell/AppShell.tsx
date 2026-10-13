import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppShell() {
  const [open, setOpen] = useState(true);

  return (
    <div className="ff-shell">
      <Sidebar open={open} onToggle={() => setOpen((o) => !o)} />
      <main className="ff-main">
        <Outlet />
      </main>
    </div>
  );
}
