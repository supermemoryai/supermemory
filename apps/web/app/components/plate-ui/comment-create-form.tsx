'use client';

import React from 'react';

import { cn } from '@udecode/cn';
import {
  CommentNewSubmitButton,
  CommentNewTextarea,
  CommentsPlugin,
} from '@udecode/plate-comments/react';
import { useEditorPlugin } from '@udecode/plate-common/react';

import { buttonVariants } from './button';
import { CommentAvatar } from './comment-avatar';
import { inputVariants } from './input';

export function CommentCreateForm() {
  const { useOption } = useEditorPlugin(CommentsPlugin);

  const myUserId = useOption('myUserId');

  return (
    <div className="flex w-full space-x-2">
      <CommentAvatar userId={myUserId} />

      <div className="flex grow flex-col items-end gap-2">
        <CommentNewTextarea className={inputVariants()} />

        <CommentNewSubmitButton
          className={cn(buttonVariants({ size: 'sm' }), 'w-[90px]')}
        >
          Comment
        </CommentNewSubmitButton>
      </div>
    </div>
  );
}
