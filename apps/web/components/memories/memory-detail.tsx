import { getDocumentIcon } from '@/lib/document-icon';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@repo/ui/components/drawer';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@repo/ui/components/sheet';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@repo/ui/components/tabs';
import { colors } from '@repo/ui/memory-graph/constants';
import type { DocumentsWithMemoriesResponseSchema } from '@repo/validation/api';
import { Badge } from '@ui/components/badge';
import { Brain, Calendar, CircleUserRound, ExternalLink, List, Sparkles } from 'lucide-react';
import { memo } from 'react';
import type { z } from 'zod';
import { formatDate, getSourceUrl } from '.';
import { Label1Regular } from '@ui/text/label/label-1-regular';

type DocumentsResponse = z.infer<typeof DocumentsWithMemoriesResponseSchema>;
type DocumentWithMemories = DocumentsResponse['documents'][0];
type MemoryEntry = DocumentWithMemories['memoryEntries'][0];

const formatDocumentType = (type: string) => {
  // Special case for PDF
  if (type.toLowerCase() === 'pdf') return 'PDF';

  // Replace underscores with spaces and capitalize each word
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const MemoryDetailItem = memo(({ memory }: { memory: MemoryEntry }) => {
  return (
    <button
      className="p-4 rounded-lg transition-all relative overflow-hidden cursor-pointer"
      style={{
        backgroundColor: memory.isLatest
          ? colors.memory.primary
          : 'rgba(255, 255, 255, 0.02)',
      }}
      tabIndex={0}
      type="button"
    >
      <div className="flex items-start gap-2 relative z-10">
        <div
          className="p-1 rounded"
          style={{
            backgroundColor: memory.isLatest
              ? colors.memory.secondary
              : 'transparent',
          }}
        >
          <Brain
            className={`w-4 h-4 flex-shrink-0 transition-all ${
              memory.isLatest ? 'text-blue-400' : 'text-blue-400/50'
            }`}
          />
        </div>
        <div className="flex-1 space-y-2">
          <Label1Regular
            className="text-sm leading-relaxed text-left"
            style={{ color: colors.text.primary }}
          >
            {memory.memory}
          </Label1Regular>
          <div className="flex gap-2 justify-between">
            <div
              className="flex items-center gap-4 text-xs"
              style={{ color: colors.text.muted }}
            >
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(memory.createdAt)}
              </span>
              <span className="font-mono">v{memory.version}</span>
              {memory.sourceRelevanceScore && (
                <span
                  className="flex items-center gap-1"
                  style={{
                    color:
                      memory.sourceRelevanceScore > 70
                        ? colors.accent.emerald
                        : colors.text.muted,
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  {memory.sourceRelevanceScore}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {memory.isForgotten && (
                <Badge
                  className="text-xs border-red-500/30 backdrop-blur-sm"
                  style={{
                    backgroundColor: colors.status.forgotten,
                    color: '#dc2626',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                  }}
                  variant="destructive"
                >
                  Forgotten
                </Badge>
              )}
              {memory.isLatest && (
                <Badge
                  className="text-xs"
                  style={{
                    backgroundColor: colors.memory.secondary,
                    color: colors.text.primary,
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                  }}
                  variant="default"
                >
                  Latest
                </Badge>
              )}
              {memory.forgetAfter && (
                <Badge
                  className="text-xs backdrop-blur-sm"
                  style={{
                    color: colors.status.expiring,
                    backgroundColor: 'rgba(251, 165, 36, 0.1)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                  }}
                  variant="outline"
                >
                  Expires: {formatDate(memory.forgetAfter)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
});

export const MemoryDetail = memo(
  ({
    document,
    isOpen,
    onClose,
    isMobile,
  }: {
    document: DocumentWithMemories | null;
    isOpen: boolean;
    onClose: () => void;
    isMobile: boolean;
  }) => {
    if (!document) return null;

    const activeMemories = document.memoryEntries.filter((m) => !m.isForgotten);
    const forgottenMemories = document.memoryEntries.filter(
      (m) => m.isForgotten
    );

    const HeaderContent = ({
      TitleComponent,
    }: {
      TitleComponent: typeof SheetTitle | typeof DrawerTitle;
    }) => (
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1">
          <div
            className="p-2 rounded-lg"
            style={{
              backgroundColor: colors.background.secondary,
            }}
          >
            {getDocumentIcon(document.type, 'w-5 h-5')}
          </div>
          <div className="flex-1">
            <TitleComponent style={{ color: colors.text.primary }}>
              {document.title || 'Untitled Document'}
            </TitleComponent>
            <div
              className="flex items-center gap-2 mt-1 text-xs"
              style={{ color: colors.text.muted }}
            >
              <span>{formatDocumentType(document.type)}</span>
              <span>•</span>
              <span>{formatDate(document.createdAt)}</span>
              {document.url && (
                <>
                  <span>•</span>
                  <button
                    className="flex items-center gap-1 transition-all hover:gap-2"
                    onClick={() => {
                      const sourceUrl = getSourceUrl(document);
                      window.open(sourceUrl ?? undefined, '_blank');
                    }}
                    style={{ color: colors.accent.primary }}
                    type="button"
                  >
                    View source
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );

    const ContentAndSummarySection = () => {
      const hasContent = document.content && document.content.trim().length > 0;
      const hasSummary = document.summary && document.summary.trim().length > 0;
      
      if (!hasContent && !hasSummary) return null;

      const defaultTab = hasContent ? 'content' : 'summary';

      return (
        <div className="mt-4">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList
              className={`grid w-full bg-white/5 border border-white/10 h-11 ${
                hasContent && hasSummary ? 'grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {hasContent && (
                <TabsTrigger
                  value="content"
                  className="text-xs bg-transparent h-8"
                  style={{ color: colors.text.secondary }}
                >
                  <CircleUserRound className="w-3 h-3" />
                  Original Content
                </TabsTrigger>
              )}
              {hasSummary && (
                <TabsTrigger
                  value="summary"
                  className="text-xs flex items-center gap-1 bg-transparent h-8"
                  style={{ color: colors.text.secondary }}
                >
                  <List className="w-3 h-3" />
                  Summary
                </TabsTrigger>
              )}
            </TabsList>

            {hasContent && (
              <TabsContent value="content" className="mt-3">
                <div className="p-3 rounded-lg max-h-48 overflow-y-auto custom-scrollbar bg-white/[0.03] border border-white/[0.08]">
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: colors.text.primary }}
                  >
                    {document.content}
                  </p>
                </div>
              </TabsContent>
            )}

            {hasSummary && (
              <TabsContent value="summary" className="mt-3">
                <div className="p-3 rounded-lg max-h-48 overflow-y-auto custom-scrollbar bg-indigo-500/5 border border-indigo-500/15">
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: colors.text.muted }}
                  >
                    {document.summary}
                  </p>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      );
    };

    const MemoryContent = () => (
      <div className="space-y-6 px-6">
        {activeMemories.length > 0 && (
          <div>
            <div
              className="text-sm font-medium mb-2 flex items-start gap-2 py-2"
              style={{
                color: colors.text.secondary,
              }}
            >
              Active Memories ({activeMemories.length})
            </div>
            <div className="space-y-3">
              {activeMemories.map((memory) => (
                <div
                  key={memory.id}
                >
                  <MemoryDetailItem memory={memory} />
                </div>
              ))}
            </div>
          </div>
        )}

        {forgottenMemories.length > 0 && (
          <div>
            <div
              className="text-sm font-medium mb-4 px-3 py-2 rounded-lg opacity-60"
              style={{
                color: colors.text.muted,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              Forgotten Memories ({forgottenMemories.length})
            </div>
            <div className="space-y-3 opacity-40">
              {forgottenMemories.map((memory) => (
                <MemoryDetailItem key={memory.id} memory={memory} />
              ))}
            </div>
          </div>
        )}

        {activeMemories.length === 0 && forgottenMemories.length === 0 && (
          <div
            className="text-center py-12 rounded-lg"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <Brain
              className="w-12 h-12 mx-auto mb-4 opacity-30"
              style={{ color: colors.text.muted }}
            />
            <p style={{ color: colors.text.muted }}>
              No memories found for this document
            </p>
          </div>
        )}
      </div>
    );

    if (isMobile) {
      return (
        <Drawer onOpenChange={onClose} open={isOpen}>
          <DrawerContent
            className="border-0 p-0 overflow-hidden max-h-[90vh]"
            style={{
              backgroundColor: colors.background.secondary,
              borderTop: `1px solid ${colors.document.border}`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {/* Header section with glass effect */}
            <div
              className="p-4 relative border-b"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: `1px solid ${colors.document.border}`,
              }}
            >
              <DrawerHeader className="pb-0 px-0 text-left">
                <HeaderContent TitleComponent={DrawerTitle} />
              </DrawerHeader>

              <ContentAndSummarySection />
            </div>

            <div className="flex-1 memory-drawer-scroll overflow-y-auto">
              <MemoryContent />
            </div>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Sheet onOpenChange={onClose} open={isOpen}>
        <SheetContent
          className="w-full sm:max-w-2xl border-0 p-0 overflow-hidden"
          style={{
            backgroundColor: colors.background.secondary,
          }}
        >
          <div
            className="p-6 relative"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <SheetHeader className="pb-0">
              <HeaderContent TitleComponent={SheetTitle} />
            </SheetHeader>

            <ContentAndSummarySection />
          </div>

          <div className="h-[calc(100vh-200px)] memory-sheet-scroll overflow-y-auto">
            <MemoryContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);
