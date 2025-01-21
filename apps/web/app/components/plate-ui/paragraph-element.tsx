'use client';

import React from 'react';

import { cn } from '@udecode/cn';
import { withRef } from '@udecode/plate-common/react';

import { PlateElement } from './plate-element';

export const ParagraphElement = withRef<typeof PlateElement>(
  ({ children, className, ...props }, ref) => {
    return (
      <PlateElement
        ref={ref}
        className={cn('m-0 px-0 py-1', className)}
        {...props}
      >
        {children}
      </PlateElement>
    );
  }
);
