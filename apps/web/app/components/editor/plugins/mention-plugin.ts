'use client';

import { MentionPlugin } from '@udecode/plate-mention/react';

export const mentionPlugin = MentionPlugin.configure({
  options: { triggerPreviousCharPattern: /^$|^[\s"']$/ },
});
