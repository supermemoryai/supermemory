import { cookies } from 'next/headers';
import MessagePoster from '../../../anycontext-front/src/app/MessagePoster';

export const runtime = 'edge';

export default function HomePage() {
  return (
    <main>
      <MessagePoster jwt={cookies().get('next-auth.session-token')?.value!} />
    </main>
  );
}
