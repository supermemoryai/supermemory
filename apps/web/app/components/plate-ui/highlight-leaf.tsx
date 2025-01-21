'use client';

import React from 'react';

import { cn, withRef } from '@udecode/cn';
import { PlateLeaf } from '@udecode/plate-common/react';

export const HighlightLeaf = withRef<typeof PlateLeaf>(
  ({ children, className, ...props }, ref) => (
    <PlateLeaf
      ref={ref}
      asChild
      className={cn('bg-highlight/30 text-inherit', className)}
      {...props}
    >
      <mark>{children}</mark>
    </PlateLeaf>
  )
);
