'use client';

import React from 'react';

import { cn } from '@udecode/cn';
import {
  CommentProvider,
  CommentsPositioner,
  SCOPE_ACTIVE_COMMENT,
  useFloatingCommentsContentState,
  useFloatingCommentsState,
} from '@udecode/plate-comments/react';
import { PortalBody } from '@udecode/plate-common/react';

import { CommentCreateForm } from './comment-create-form';
import { CommentItem } from './comment-item';
import { CommentReplyItems } from './comment-reply-items';
import { popoverVariants } from './popover';

export type FloatingCommentsContentProps = {
  disableForm?: boolean;
};

export function CommentsPopoverContent(props: FloatingCommentsContentProps) {
  const { disableForm } = props;

  const { activeCommentId, hasNoComment, myUserId, ref } =
    useFloatingCommentsContentState();

  return (
    <CommentProvider
      id={activeCommentId!}
      key={activeCommentId}
      scope={SCOPE_ACTIVE_COMMENT}
    >
      <div ref={ref} className={cn(popoverVariants(), 'relative w-[310px]')}>
        {!hasNoComment && (
          <>
            <CommentItem key={activeCommentId} commentId={activeCommentId!} />

            <CommentReplyItems />
          </>
        )}

        {!!myUserId && !disableForm && <CommentCreateForm />}
      </div>
    </CommentProvider>
  );
}

export function CommentsPopover() {
  const { activeCommentId, loaded } = useFloatingCommentsState();

  if (!loaded || !activeCommentId) return null;

  return (
    <PortalBody>
      <CommentsPositioner className="absolute z-50 w-[418px] pb-4" data-popover>
        <CommentsPopoverContent />
      </CommentsPositioner>
    </PortalBody>
  );
}
