'use client';

import { withRef } from '@udecode/cn';
import {
  useIndentTodoToolBarButton,
  useIndentTodoToolBarButtonState,
} from '@udecode/plate-indent-list/react';
import { Square } from 'lucide-react';

import { ToolbarButton } from './toolbar';

export const IndentTodoToolbarButton = withRef<typeof ToolbarButton>(
  (rest, ref) => {
    const state = useIndentTodoToolBarButtonState({ nodeType: 'todo' });
    const { props } = useIndentTodoToolBarButton(state);

    return (
      <ToolbarButton ref={ref} tooltip="Todo" {...props} {...rest}>
        <Square />
      </ToolbarButton>
    );
  }
);
