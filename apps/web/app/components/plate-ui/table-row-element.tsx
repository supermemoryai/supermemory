'use client';

import React from 'react';

import { cn, withRef } from '@udecode/cn';
import { PlateElement } from '@udecode/plate-common/react';

export const TableRowElement = withRef<
  typeof PlateElement,
  {
    hideBorder?: boolean;
  }
>(({ children, hideBorder, ...props }, ref) => {
  return (
    <PlateElement
      ref={ref}
      as="tr"
      className={cn('h-full', hideBorder && 'border-none')}
      {...props}
    >
      {children}
    </PlateElement>
  );
});
