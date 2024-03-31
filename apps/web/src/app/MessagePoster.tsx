'use client';

import { useEffect } from 'react';

function MessagePoster({ jwt }: { jwt: string }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.postMessage({ jwt }, '*');
  }, [jwt]);

  return (
    <button onClick={() => window.postMessage({ jwt }, '*')}>
      Send auth token to extension
    </button>
  );
}

export default MessagePoster;
