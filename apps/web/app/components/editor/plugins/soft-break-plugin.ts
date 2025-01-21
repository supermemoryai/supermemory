'use client';

import { BlockquotePlugin } from '@udecode/plate-block-quote/react';
import { SoftBreakPlugin } from '@udecode/plate-break/react';
import { CalloutPlugin } from '@udecode/plate-callout/react';
import { CodeBlockPlugin } from '@udecode/plate-code-block/react';
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
} from '@udecode/plate-table/react';

export const softBreakPlugin = SoftBreakPlugin.configure({
  options: {
    rules: [
      { hotkey: 'shift+enter' },
      {
        hotkey: 'enter',
        query: {
          allow: [
            CodeBlockPlugin.key,
            BlockquotePlugin.key,
            TableCellPlugin.key,
            TableCellHeaderPlugin.key,
            CalloutPlugin.key,
          ],
        },
      },
    ],
  },
});
