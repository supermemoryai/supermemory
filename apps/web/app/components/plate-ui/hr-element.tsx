'use client';

import React from 'react';

import { cn, withRef } from '@udecode/cn';
import { useFocused, useSelected } from 'slate-react';

import { PlateElement } from './plate-element';

export const HrElement = withRef<typeof PlateElement>(
  ({ className, nodeProps, ...props }, ref) => {
    const { children } = props;

    const selected = useSelected();
    const focused = useFocused();

    return (
      <PlateElement ref={ref} className={className} {...props}>
        <div className="py-6" contentEditable={false}>
          <hr
            {...nodeProps}
            className={cn(
              'h-0.5 cursor-pointer rounded-sm border-none bg-muted bg-clip-content',
              selected && focused && 'ring-2 ring-ring ring-offset-2'
            )}
          />
        </div>
        {children}
      </PlateElement>
    );
  }
);
