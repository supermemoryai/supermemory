'use client';

import { createPlatePlugin } from '@udecode/plate-common/react';

import { FixedToolbar } from '~/components/plate-ui/fixed-toolbar';
import { FixedToolbarButtons } from '~/components/plate-ui/fixed-toolbar-buttons';

export const FixedToolbarPlugin = createPlatePlugin({
  key: 'fixed-toolbar',
  render: {
    beforeEditable: () => (
      <FixedToolbar>
        <FixedToolbarButtons />
      </FixedToolbar>
    ),
  },
});
