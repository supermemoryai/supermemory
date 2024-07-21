import { getChatHistory } from '@repo/web/app/actions/fetchers';
import { ArrowLongRightIcon } from '@heroicons/react/24/outline';
import { Skeleton } from '@repo/ui/shadcn/skeleton';
import Link from 'next/link';
import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { chatThreads } from '@/server/db/schema';

const History = memo(() => {
  const [chatThreads_, setChatThreads] = useState<
    (typeof chatThreads.$inferSelect)[] | null
  >(null);

  useEffect(() => {
    (async () => {
      const chatThreads = await getChatHistory();
      if (!chatThreads.success || !chatThreads.data) {
        console.error(chatThreads.error);
        return;
      }
      setChatThreads(chatThreads.data.reverse().slice(0, 3));
    })();
  }, []);

  if (!chatThreads) {
    return (
      <>
        <Skeleton className="w-[80%] h-4 bg-[#3b444b] "></Skeleton>
        <Skeleton className="w-[40%] h-4 bg-[#3b444b] "></Skeleton>
        <Skeleton className="w-[60%] h-4 bg-[#3b444b] "></Skeleton>
      </>
    );
  }

  return (
    <ul className="text-base list-none space-y-3 text-[#b9b9b9] mt-8">
      {chatThreads_?.map((thread) => (
        <motion.li
          initial={{ opacity: 0, filter: 'blur(1px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          className="flex items-center gap-2 truncate"
        >
          <ArrowLongRightIcon className="h-5" />{' '}
          <Link prefetch={false} href={`/chat/${thread.id}`}>
            {thread.firstMessage}
          </Link>
        </motion.li>
      ))}
    </ul>
  );
});

export default History;
