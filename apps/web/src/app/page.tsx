import { db } from '@/server/db';
import { sessions, storedContent, users } from '@/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar/index';
import Main from '@/components/Main';
import MessagePoster from './MessagePoster';
import { transformContent } from '../../types/memory';

export const runtime = 'edge';

export default async function Home() {
  const token =
    cookies().get('next-auth.session-token')?.value ??
    cookies().get('__Secure-authjs.session-token')?.value ??
    cookies().get('authjs.session-token')?.value ??
    headers().get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return redirect('/api/auth/signin');
  }

  const selectedItem = cookies().get('selectedItem')?.value;

  const setSelectedItem = async (selectedItem: string | null) => {
    'use server';
    cookies().set('selectedItem', selectedItem!);
  };

  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionToken, token!));

  if (!session || session.length === 0) {
    return redirect('/api/auth/signin');
  }

  const [userData] = await db
    .select()
    .from(users)
    .where(eq(users.id, session[0].userId))
    .limit(1);

  if (!userData) {
    return redirect('/api/auth/signin');
  }

  const posts = await db
    .select()
    .from(storedContent)
    .where(eq(storedContent.user, userData.id));

  const collectedSpaces = transformContent(posts);

  return (
    <div className="flex w-screen">
      <Sidebar selectChange={setSelectedItem} spaces={collectedSpaces} />
      <Main sidebarOpen={selectedItem !== null} />
      <MessagePoster jwt={token} />
    </div>
  );
}
