'use client';

import React from 'react';

import { withRef } from '@udecode/cn';
import { useOutdentButton } from '@udecode/plate-indent/react';
import { Outdent } from 'lucide-react';

import { ToolbarButton } from './toolbar';

export const OutdentToolbarButton = withRef<typeof ToolbarButton>(
  (rest, ref) => {
    const { props } = useOutdentButton();

    return (
      <ToolbarButton ref={ref} tooltip="Outdent" {...props} {...rest}>
        <Outdent />
      </ToolbarButton>
    );
  }
);
