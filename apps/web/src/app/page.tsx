import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CardContent, Card } from '@/components/ui/card';
import { db } from '@/server/db';
import {
  sessions,
  storedContent,
  userStoredContent,
  users,
} from '@/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import QueryAI from '@/components/QueryAI';

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

  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionToken, token!));

  if (!session || session.length === 0) {
    return redirect('/api/auth/signin');
  }

  const userContent = await db
    .select()
    .from(userStoredContent)
    .where(eq(userStoredContent.userId, session[0].userId));

  const userData = await db
    .select()
    .from(users)
    .where(eq(users.id, session[0].userId))
    .limit(1);

  if (!userData || userData.length === 0) {
    return redirect('/api/auth/signin');
  }

  const listOfContent =
    userContent.map((content) => content.contentId).length > 0
      ? userContent.map((content) => content.contentId)
      : [1];

  const posts = await db
    .select()
    .from(storedContent)
    .where(inArray(storedContent.id, listOfContent));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="flex flex-col mt-16">
        <div className="flex flex-col md:flex-row gap-4">
          <Image
            className="rounded-2xl"
            src="/logo.png"
            width={120}
            height={120}
            alt="logo"
          />
          <div className="mt-4  text-gray-400 max-w-md">
            <h1 className="text-xl font-bold text-white">SuperMemory</h1>
            Remember that one thing you read a while ago? We got you covered.
            Add the extension, click a button and I'll remember it for you.{' '}
            <a
              href="https://github.com/dhravyashah/anycontext"
              target="_blank"
              rel="noreferrer"
              className="text-sky-500"
            >
              Get the Extension
            </a>
          </div>
        </div>
      </div>

      <QueryAI />

      {/* TODO: LABEL THE WEBSITES USING A CLASSIFICATION MODEL */}
      {/* <nav className="flex space-x-2 my-4">
        <Badge variant="secondary">Technology (2)</Badge>
        <Badge variant="secondary">Business & Finance (1)</Badge>
        <Badge variant="secondary">Education & Career (1)</Badge>
      </nav> */}
      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
        {posts.reverse().map((post) => (
          <a
            href={post.url}
            target="_blank"
            rel="noreferrer"
            className="hover:scale-105 ease-in-out transition-transform duration-300"
          >
            <Card className="w-full">
              <img
                alt="Not found"
                className="w-full h-48 object-cover rounded-md"
                height="200"
                src={
                  post.image && post.image !== 'Image not found'
                    ? post.image
                    : '/placeholder.svg'
                }
                style={{
                  aspectRatio: '300/200',
                  objectFit: 'cover',
                }}
                width="300"
              />
              <CardContent>
                <h3 className="text-lg font-semibold mt-4">{post.title}</h3>
                <p className="text-sm text-gray-600">{post.baseUrl}</p>
                <p className="text-sm">{post.description}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </main>
    </div>
  );
}
