import Main from '@/components/Main';
import Sidebar from '@/components/Sidebar/index';
import { cookies } from 'next/headers';

export default function Home() {
  const selectedItem = cookies().get('selectedItem')?.value;
  const setSelectedItem = async (selectedItem: string | null) => {
    'use server';
    cookies().set('selectedItem', selectedItem!);
  };

  return (
    <div className="flex w-screen">
      {/* <Sidebar selectChange={setSelectedItem} spaces={spaces} /> */}
      <Main sidebarOpen={selectedItem !== null} />
    </div>
  );
}
