'use client';

import { HorizontalRulePlugin } from '@udecode/plate-horizontal-rule/react';
import { ImagePlugin, MediaEmbedPlugin } from '@udecode/plate-media/react';
import { DeletePlugin, SelectOnBackspacePlugin } from '@udecode/plate-select';

export const deletePlugins = [
  SelectOnBackspacePlugin.configure({
    options: {
      query: {
        allow: [
          ImagePlugin.key,
          MediaEmbedPlugin.key,
          HorizontalRulePlugin.key,
        ],
      },
    },
  }),
  DeletePlugin,
] as const;
