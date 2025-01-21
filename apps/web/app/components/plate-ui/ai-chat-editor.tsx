'use client';

import React, { memo } from 'react';

import { AIChatPlugin, useLastAssistantMessage } from '@udecode/plate-ai/react';
import {
  type PlateEditor,
  Plate,
  useEditorPlugin,
} from '@udecode/plate-common/react';
import { deserializeMd } from '@udecode/plate-markdown';

import { Editor } from './editor';

export const AIChatEditor = memo(
  ({
    aiEditorRef,
  }: {
    aiEditorRef: React.MutableRefObject<PlateEditor | null>;
  }) => {
    const { getOptions } = useEditorPlugin(AIChatPlugin);
    const lastAssistantMessage = useLastAssistantMessage();
    const content = lastAssistantMessage?.content ?? '';

    const aiEditor = React.useMemo(() => {
      const editor = getOptions().createAIEditor();

      const fragment = deserializeMd(editor, content);
      editor.children =
        fragment.length > 0 ? fragment : editor.api.create.value();

      return editor;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
      if (aiEditor && content) {
        aiEditorRef.current = aiEditor;

        setTimeout(() => {
          aiEditor.tf.setValue(deserializeMd(aiEditor, content));
        }, 0);
      }
    }, [aiEditor, aiEditorRef, content]);

    if (!content) return null;

    return (
      <Plate editor={aiEditor}>
        <Editor variant="aiChat" readOnly />
      </Plate>
    );
  }
);
