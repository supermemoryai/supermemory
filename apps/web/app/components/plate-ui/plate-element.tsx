'use client';

import React from 'react';

import type { PlateElementProps } from '@udecode/plate-common/react';

import { cn } from '@udecode/cn';
import { PlateElement as PlateElementPrimitive } from '@udecode/plate-common/react';

import { BlockSelection } from './block-selection';

export const PlateElement = React.forwardRef<HTMLDivElement, PlateElementProps>(
  ({ children, className, ...props }: PlateElementProps, ref) => {
    return (
      <PlateElementPrimitive
        ref={ref}
        className={cn('relative', className)}
        {...props}
      >
        {children}

        {className?.includes('slate-selectable') && <BlockSelection />}
      </PlateElementPrimitive>
    );
  }
);
