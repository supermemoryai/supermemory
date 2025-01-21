'use client';

import React from 'react';

import type { CopilotPluginConfig } from '@udecode/plate-ai/react';

import { useEditorPlugin, useElement } from '@udecode/plate-common/react';

export const GhostText = () => {
  const { useOption } = useEditorPlugin<CopilotPluginConfig>({
    key: 'copilot',
  });
  const element = useElement();

  const isSuggested = useOption('isSuggested', element.id as string);

  if (!isSuggested) return null;

  return <GhostTextContent />;
};

export function GhostTextContent() {
  const { useOption } = useEditorPlugin<CopilotPluginConfig>({
    key: 'copilot',
  });

  const suggestionText = useOption('suggestionText');

  return (
    <span
      className="max-sm:hidden pointer-events-none text-muted-foreground/70"
      contentEditable={false}
    >
      {suggestionText && suggestionText}
    </span>
  );
}
