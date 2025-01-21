'use client';

import React from 'react';

import { withRef } from '@udecode/cn';
import {
  useLinkToolbarButton,
  useLinkToolbarButtonState,
} from '@udecode/plate-link/react';
import { Link } from 'lucide-react';

import { ToolbarButton } from './toolbar';

export const LinkToolbarButton = withRef<typeof ToolbarButton>((rest, ref) => {
  const state = useLinkToolbarButtonState();
  const { props } = useLinkToolbarButton(state);

  return (
    <ToolbarButton
      ref={ref}
      data-plate-focus
      tooltip="Link"
      {...props}
      {...rest}
    >
      <Link />
    </ToolbarButton>
  );
});
