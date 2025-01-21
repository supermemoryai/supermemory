'use client';

import React from 'react';

import { withRef } from '@udecode/cn';
import {
  useToggleToolbarButton,
  useToggleToolbarButtonState,
} from '@udecode/plate-toggle/react';
import { ChevronRightIcon } from 'lucide-react';

import { ToolbarButton } from './toolbar';

export const ToggleToolbarButton = withRef<typeof ToolbarButton>(
  (rest, ref) => {
    const state = useToggleToolbarButtonState();
    const { props } = useToggleToolbarButton(state);

    return (
      <ToolbarButton ref={ref} tooltip="Toggle" {...props} {...rest}>
        <ChevronRightIcon />
      </ToolbarButton>
    );
  }
);
