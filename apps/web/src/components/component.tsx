import { Input } from '@/components/ui/input';
import { AvatarImage, AvatarFallback, Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardContent, CardFooter, Card } from '@/components/ui/card';
import { db } from '@/server/db';
import { storedContent } from '@/server/db/schema';
import { parser } from 'html-metadata-parser';
import { getMetaData } from '@/server/helpers';


export async function Component() {
  // const posts = await db.query.storedContent.findMany({
  //   where: (users, { eq }) => eq(users.id, 1),
  // });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <header className="flex justify-between items-center py-6">
        <div className="flex items-center space-x-4">
          <FlagIcon className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900">zenfetch</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Input className="w-72" placeholder="Search..." />
          <Avatar>
            <AvatarImage
              alt="User avatar"
              src="/placeholder.svg?height=32&width=32"
            />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <Button className="whitespace-nowrap" variant="outline">
            Chat with AI
          </Button>
        </div>
      </header>
      <nav className="flex space-x-2 my-4">
        <Badge variant="secondary">Technology (2)</Badge>
        <Badge variant="secondary">Business & Finance (1)</Badge>
        <Badge variant="secondary">Education & Career (1)</Badge>
      </nav>
      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* {metadata.map((post) => (
          <Card className="w-full">
            <img
              alt="Hard drive"
              className="w-full h-48 object-cover"
              height="200"
              src={post.image}
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
        ))} */}
      </main>
    </div>
  );
}

function FlagIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  );
}
