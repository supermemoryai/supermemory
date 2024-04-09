import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { User } from 'next-auth';
import { User2 } from 'lucide-react';
import Image from 'next/image';

function ChatMessage({
  message,
  user,
  sources,
}: {
  message: string;
  user: User | 'ai';
  sources?: string[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className={`font-bold ${!(user === 'ai') && 'text-xl '} flex flex-col md:flex-row items-center gap-4`}
      >
        <Avatar>
          {user === 'ai' ? (
            <Image
              src="/logo.png"
              width={48}
              height={48}
              alt="AI"
              className="rounded-md w-12 h-12"
            />
          ) : user?.image ? (
            <>
              <AvatarImage
                className="h-6 w-6 rounded-lg"
                src={user?.image}
                alt="user pfp"
              />
              <AvatarFallback>
                {user?.name?.split(' ').map((n) => n[0])}{' '}
              </AvatarFallback>
            </>
          ) : (
            <User2 strokeWidth={1.3} className="h-6 w-6" />
          )}
        </Avatar>
        <div className="ml-4">{message}</div>
      </div>
      <div className="w-full h-0.5 bg-gray-700 my-2 md:my-0 md:mx-4 mt-8"></div>
    </div>
  );
}

export { ChatMessage };
