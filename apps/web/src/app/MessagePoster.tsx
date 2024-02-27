'use client';

import { useEffect } from 'react';

function MessagePoster({ jwt }: { jwt: string }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.postMessage({ jwt }, '*');
  }, [jwt]);

  return (
    <button onClick={() => window.postMessage({ jwt }, '*')}>
      Validate Extension
    </button>
  );
}

export default MessagePoster;
