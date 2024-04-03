import {
  MemoryWithImage,
  MemoryWithImages3,
  MemoryWithImages2,
} from '@/assets/MemoryWithImages';
import { type Space } from '../../../types/memory';
import { InputWithIcon } from '../ui/input';
import { Search } from 'lucide-react';

export function MemoriesBar() {
  const spaces: Space[] = [
    {
      id: 1,
      title: 'Cool Tech',
      description: 'Really cool mind blowing tech',
      content: [
        {
          id: 1,
          title: 'Perplexity',
          description: 'A good ui',
          content: '',
          image: 'https://perplexity.ai/favicon.ico',
          url: 'https://perplexity.ai',
          savedAt: new Date(),
          baseUrl: 'https://perplexity.ai',
          space: 'Cool tech',
        },
        {
          id: 2,
          title: 'Pi.ai',
          description: 'A good ui',
          content: '',
          image: 'https://pi.ai/pi-logo-192.png?v=2',
          url: 'https://pi.ai',
          savedAt: new Date(),
          baseUrl: 'https://pi.ai',
          space: 'Cool tech',
        },
        {
          id: 3,
          title: 'Visual Studio Code',
          description: 'A good ui',
          content: '',
          image: 'https://code.visualstudio.com/favicon.ico',
          url: 'https://code.visualstudio.com',
          savedAt: new Date(),
          baseUrl: 'https://code.visualstudio.com',
          space: 'Cool tech',
        },
      ],
    },
    {
      id: 2,
      title: 'Cool Courses',
      description: 'Amazng',
      content: [
        {
          id: 1,
          title: 'Animation on the web',
          description: 'A good ui',
          content: '',
          image: 'https://animations.dev/favicon.ico',
          url: 'https://animations.dev',
          savedAt: new Date(),
          baseUrl: 'https://animations.dev',
          space: 'Cool courses',
        },
        {
          id: 2,
          title: 'Tailwind Course',
          description: 'A good ui',
          content: '',
          image:
            'https://tailwindcss.com/_next/static/media/tailwindcss-mark.3c5441fc7a190fb1800d4a5c7f07ba4b1345a9c8.svg',
          url: 'https://tailwindcss.com',
          savedAt: new Date(),
          baseUrl: 'https://tailwindcss.com',
          space: 'Cool courses',
        },
      ],
    },
    {
      id: 3,
      title: 'Cool Libraries',
      description: 'Really cool mind blowing tech',
      content: [
        {
          id: 1,
          title: 'Perplexity',
          description: 'A good ui',
          content: '',
          image: 'https://yashverma.me/logo.jpg',
          url: 'https://perplexity.ai',
          savedAt: new Date(),
          baseUrl: 'https://perplexity.ai',
          space: 'Cool libraries',
        },
      ],
    },
  ];

  return (
    <div className="text-rgray-11 flex w-full flex-col items-start py-8 text-left">
      <div className="w-full px-8">
        <h1 className="w-full text-2xl">Your Memories</h1>
        <InputWithIcon
          placeholder="Search"
          icon={<Search className="text-rgray-11 h-5 w-5 opacity-50" />}
          className="bg-rgray-4 mt-2 w-full"
        />
      </div>
      <div className="grid w-full grid-flow-row grid-cols-3 gap-1 px-2 py-5">
        {spaces.map((space) => (
          <Space key={space.id} {...space} />
        ))}
      </div>
    </div>
  );
}

export function Space({ title, description, content, id }: Space) {
  console.log(title, content.map((c) => c.image).reverse());
  return (
    <button className="hover:bg-rgray-2 focus-visible:bg-rgray-2 focus-visible:ring-rgray-7 flex flex-col items-center justify-center rounded-md p-2 pb-4 text-center font-normal ring-transparent transition focus-visible:outline-none focus-visible:ring-2">
      {content.length > 2 ? (
        <MemoryWithImages3
          className="h-24 w-24"
          id={id.toString()}
          images={content.map((c) => c.image).reverse() as string[]}
        />
      ) : content.length === 1 ? (
        <MemoryWithImage
          className="h-24 w-24"
          id={id.toString()}
          image={content[0].image!}
        />
      ) : (
        <MemoryWithImages2
          className="h-24 w-24"
          id={id.toString()}
          images={content.map((c) => c.image).reverse() as string[]}
        />
      )}
      <span>{title}</span>
    </button>
  );
}
