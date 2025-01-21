'use client';

import { ParagraphPlugin } from '@udecode/plate-common/react';
import { HEADING_LEVELS } from '@udecode/plate-heading';
import { LineHeightPlugin } from '@udecode/plate-line-height/react';

export const lineHeightPlugin = LineHeightPlugin.configure({
  inject: {
    nodeProps: {
      defaultNodeValue: 1.5,
      validNodeValues: [1, 1.2, 1.5, 2, 3],
    },
    targetPlugins: [ParagraphPlugin.key, ...HEADING_LEVELS],
  },
});
