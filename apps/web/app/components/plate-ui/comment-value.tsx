'use client';

import React from 'react';

import { cn } from '@udecode/cn';
import {
  CommentEditActions,
  CommentEditTextarea,
} from '@udecode/plate-comments/react';

import { buttonVariants } from './button';
import { inputVariants } from './input';

export function CommentValue() {
  return (
    <div className="my-2 flex flex-col items-end gap-2">
      <CommentEditTextarea className={cn(inputVariants(), 'min-h-[60px]')} />

      <div className="flex space-x-2">
        <CommentEditActions.CancelButton
          className={buttonVariants({ size: 'xs', variant: 'outline' })}
        >
          Cancel
        </CommentEditActions.CancelButton>

        <CommentEditActions.SaveButton
          className={buttonVariants({ size: 'xs', variant: 'default' })}
        >
          Save
        </CommentEditActions.SaveButton>
      </div>
    </div>
  );
}
