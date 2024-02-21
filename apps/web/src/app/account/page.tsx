import { cookies } from 'next/headers';
import MessagePoster from './client';

async function Page() {
    const token = cookies().get('next-auth.session-token')?.value

    return <MessagePoster jwt={token!} />
}

export default Page