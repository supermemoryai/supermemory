'use client';

import { BlockSelectionPlugin } from '@udecode/plate-selection/react';

export const blockSelectionPlugins = [
  BlockSelectionPlugin.configure({
    inject: {
      excludeBelowPlugins: ['tr'],
      excludePlugins: ['table', 'code_line', 'column_group', 'column'],
    },
    options: {
      areaOptions: {
        behaviour: {
          scrolling: {
            speedDivider: 1.5,
          },
          startThreshold: 4,
        },
      },
      enableContextMenu: true,
    },
  }),
] as const;
