'use client';
import Main from '@/components/Main';
import Sidebar from '@/components/Sidebar/index';
import { SessionProvider } from 'next-auth/react';
import { useState } from 'react';

export default function Content() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  return (
    <SessionProvider>
      <div className="flex w-screen">
        <Sidebar selectChange={setSelectedItem} />
        <Main sidebarOpen={selectedItem !== null} />
      </div>
    </SessionProvider>
  );
}
