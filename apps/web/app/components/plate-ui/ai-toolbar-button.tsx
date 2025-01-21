'use client';

import React from 'react';

import { withRef } from '@udecode/cn';
import { AIChatPlugin } from '@udecode/plate-ai/react';
import { useEditorPlugin } from '@udecode/plate-common/react';

import { ToolbarButton } from './toolbar';

export const AIToolbarButton = withRef<typeof ToolbarButton>(
  ({ children, ...rest }, ref) => {
    const { api } = useEditorPlugin(AIChatPlugin);

    return (
      <ToolbarButton
        ref={ref}
        {...rest}
        onClick={() => {
          api.aiChat.show();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
      >
        {children}
      </ToolbarButton>
    );
  }
);
