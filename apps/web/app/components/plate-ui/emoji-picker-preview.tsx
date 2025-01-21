'use client';

import type { UseEmojiPickerType } from '@udecode/plate-emoji/react';

export type EmojiPickerPreviewProps = Pick<
  UseEmojiPickerType,
  'emoji' | 'hasFound' | 'i18n' | 'isSearching'
>;

export type EmojiPreviewProps = Pick<UseEmojiPickerType, 'emoji'>;

export type NoEmojiPreviewProps = Pick<UseEmojiPickerType, 'i18n'>;

export type PickAnEmojiPreviewProps = NoEmojiPreviewProps;

function EmojiPreview({ emoji }: EmojiPreviewProps) {
  return (
    <div className="flex h-14 max-h-14 min-h-14 items-center border-t border-muted p-2">
      <div className="flex items-center justify-center text-2xl">
        {emoji?.skins[0].native}
      </div>
      <div className="overflow-hidden pl-2">
        <div className="truncate text-sm font-semibold">{emoji?.name}</div>
        <div className="truncate text-sm">{`:${emoji?.id}:`}</div>
      </div>
    </div>
  );
}

function NoEmoji({ i18n }: NoEmojiPreviewProps) {
  return (
    <div className="flex h-14 max-h-14 min-h-14 items-center border-t border-muted p-2">
      <div className="flex items-center justify-center text-2xl">😢</div>
      <div className="overflow-hidden pl-2">
        <div className="truncate text-sm font-bold">
          {i18n.searchNoResultsTitle}
        </div>
        <div className="truncate text-sm">{i18n.searchNoResultsSubtitle}</div>
      </div>
    </div>
  );
}

function PickAnEmoji({ i18n }: PickAnEmojiPreviewProps) {
  return (
    <div className="flex h-14 max-h-14 min-h-14 items-center border-t border-muted p-2">
      <div className="flex items-center justify-center text-2xl">☝️</div>
      <div className="overflow-hidden pl-2">
        <div className="truncate text-sm font-semibold">{i18n.pick}</div>
      </div>
    </div>
  );
}

export function EmojiPickerPreview({
  emoji,
  hasFound = true,
  i18n,
  isSearching = false,
  ...props
}: EmojiPickerPreviewProps) {
  const showPickEmoji = !emoji && (!isSearching || hasFound);
  const showNoEmoji = isSearching && !hasFound;
  const showPreview = emoji && !showNoEmoji && !showNoEmoji;

  return (
    <>
      {showPreview && <EmojiPreview emoji={emoji} {...props} />}
      {showPickEmoji && <PickAnEmoji i18n={i18n} {...props} />}
      {showNoEmoji && <NoEmoji i18n={i18n} {...props} />}
    </>
  );
}
