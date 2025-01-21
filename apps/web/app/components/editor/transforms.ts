'use client';

import type { PlateEditor } from '@udecode/plate-common/react';

import { insertCallout } from '@udecode/plate-callout';
import { CalloutPlugin } from '@udecode/plate-callout/react';
import { insertCodeBlock } from '@udecode/plate-code-block';
import { CodeBlockPlugin } from '@udecode/plate-code-block/react';
import {
  type TElement,
  type TNodeEntry,
  getBlockAbove,
  getBlocks,
  getNodeEntry,
  insertNodes,
  removeEmptyPreviousBlock,
  setNodes,
  unsetNodes,
  withoutNormalizing,
} from '@udecode/plate-common';
import { insertDate } from '@udecode/plate-date';
import { DatePlugin } from '@udecode/plate-date/react';
import { insertToc } from '@udecode/plate-heading';
import { TocPlugin } from '@udecode/plate-heading/react';
import { INDENT_LIST_KEYS, ListStyleType } from '@udecode/plate-indent-list';
import { IndentListPlugin } from '@udecode/plate-indent-list/react';
import { insertColumnGroup, toggleColumnGroup } from '@udecode/plate-layout';
import { LinkPlugin, triggerFloatingLink } from '@udecode/plate-link/react';
import { insertEquation, insertInlineEquation } from '@udecode/plate-math';
import {
  EquationPlugin,
  InlineEquationPlugin,
} from '@udecode/plate-math/react';
import {
  insertAudioPlaceholder,
  insertFilePlaceholder,
  insertMedia,
  insertVideoPlaceholder,
} from '@udecode/plate-media';
import {
  AudioPlugin,
  FilePlugin,
  ImagePlugin,
  MediaEmbedPlugin,
  VideoPlugin,
} from '@udecode/plate-media/react';
import { TablePlugin, insertTable } from '@udecode/plate-table/react';
import { Path } from 'slate';

const ACTION_THREE_COLUMNS = 'action_three_columns';

const insertList = (editor: PlateEditor, type: string) => {
  insertNodes(
    editor,
    editor.api.create.block({
      indent: 1,
      listStyleType: type,
    }),
    { select: true }
  );
};

const insertBlockMap: Record<
  string,
  (editor: PlateEditor, type: string) => void
> = {
  [ACTION_THREE_COLUMNS]: (editor) =>
    insertColumnGroup(editor, { layout: 3, select: true }),
  [AudioPlugin.key]: (editor) =>
    insertAudioPlaceholder(editor, { select: true }),
  [CalloutPlugin.key]: (editor) => insertCallout(editor, { select: true }),
  [CodeBlockPlugin.key]: (editor) => insertCodeBlock(editor, { select: true }),
  [EquationPlugin.key]: (editor) => insertEquation(editor, { select: true }),
  [FilePlugin.key]: (editor) => insertFilePlaceholder(editor, { select: true }),
  [INDENT_LIST_KEYS.todo]: insertList,
  [ImagePlugin.key]: (editor) =>
    insertMedia(editor, {
      select: true,
      type: ImagePlugin.key,
    }),
  [ListStyleType.Decimal]: insertList,
  [ListStyleType.Disc]: insertList,
  [MediaEmbedPlugin.key]: (editor) =>
    insertMedia(editor, {
      select: true,
      type: MediaEmbedPlugin.key,
    }),
  [TablePlugin.key]: (editor) => insertTable(editor, {}, { select: true }),
  [TocPlugin.key]: (editor) => insertToc(editor, { select: true }),
  [VideoPlugin.key]: (editor) =>
    insertVideoPlaceholder(editor, { select: true }),
};

const insertInlineMap: Record<
  string,
  (editor: PlateEditor, type: string) => void
> = {
  [DatePlugin.key]: (editor) => insertDate(editor, { select: true }),
  [InlineEquationPlugin.key]: (editor) =>
    insertInlineEquation(editor, '', { select: true }),
  [LinkPlugin.key]: (editor) => triggerFloatingLink(editor, { focused: true }),
};

export const insertBlock = (editor: PlateEditor, type: string) => {
  withoutNormalizing(editor, () => {
    if (type in insertBlockMap) {
      insertBlockMap[type](editor, type);
    } else {
      const path = getBlockAbove(editor)?.[1];

      if (!path) return;

      const at = Path.next(path);

      insertNodes(editor, editor.api.create.block({ type }), {
        at,
        select: true,
      });
    }

    removeEmptyPreviousBlock(editor);
  });
};

export const insertInlineElement = (editor: PlateEditor, type: string) => {
  if (insertInlineMap[type]) {
    insertInlineMap[type](editor, type);
  }
};

const setList = (
  editor: PlateEditor,
  type: string,
  entry: TNodeEntry<TElement>
) => {
  setNodes(
    editor,
    editor.api.create.block({
      indent: 1,
      listStyleType: type,
    }),
    {
      at: entry[1],
    }
  );
};

const setBlockMap: Record<
  string,
  (editor: PlateEditor, type: string, entry: TNodeEntry<TElement>) => void
> = {
  [ACTION_THREE_COLUMNS]: (editor) => toggleColumnGroup(editor, { layout: 3 }),
  [INDENT_LIST_KEYS.todo]: setList,
  [ListStyleType.Decimal]: setList,
  [ListStyleType.Disc]: setList,
};

export const setBlockType = (
  editor: PlateEditor,
  type: string,
  { at }: { at?: Path } = {}
) => {
  withoutNormalizing(editor, () => {
    const setEntry = (entry: TNodeEntry<TElement>) => {
      const [node, path] = entry;

      if (node[IndentListPlugin.key]) {
        unsetNodes(editor, [IndentListPlugin.key, 'indent'], { at: path });
      }
      if (type in setBlockMap) {
        return setBlockMap[type](editor, type, entry);
      }
      if (node.type !== type) {
        editor.setNodes<TElement>({ type }, { at: path });
      }
    };

    if (at) {
      const entry = getNodeEntry<TElement>(editor, at);

      if (entry) {
        setEntry(entry);

        return;
      }
    }

    const entries = getBlocks(editor);

    entries.forEach((entry) => setEntry(entry));
  });
};

export const getBlockType = (block: TElement) => {
  if (block[IndentListPlugin.key]) {
    if (block[IndentListPlugin.key] === ListStyleType.Decimal) {
      return ListStyleType.Decimal;
    } else if (block[IndentListPlugin.key] === INDENT_LIST_KEYS.todo) {
      return INDENT_LIST_KEYS.todo;
    } else {
      return ListStyleType.Disc;
    }
  }

  return block.type;
};
