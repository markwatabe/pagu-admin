import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { Footer } from './Footer';
import { ChatPanel } from './ChatPanel';
import { useAppBadge } from '../hooks/useAppBadge';

export function AppLayout() {
  useAppBadge();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <AppHeader onToggleChat={() => setChatOpen((o) => !o)} />
      <main>
        <Outlet />
      </main>
      <Footer />
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
