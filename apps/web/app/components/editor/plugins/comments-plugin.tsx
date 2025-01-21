'use client';

import { CommentsPlugin } from '@udecode/plate-comments/react';

import { CommentsPopover } from '~/components/plate-ui/comments-popover';

export const commentsPlugin = CommentsPlugin.configure({
  options: {
    myUserId: '1',
    users: {
      1: {
        id: '1',
        avatarUrl: 'https://avatars.githubusercontent.com/u/19695832?s=96&v=4',
        name: 'zbeyens',
      },
      2: {
        id: '2',
        avatarUrl: 'https://avatars.githubusercontent.com/u/4272090?v=4',
        name: '12joan',
      },
    },
  },
  render: { afterEditable: () => <CommentsPopover /> },
});
