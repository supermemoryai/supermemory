import { withProps } from "@udecode/cn";
import { AIPlugin } from "@udecode/plate-ai/react";
import {
	BoldPlugin,
	CodePlugin,
	ItalicPlugin,
	StrikethroughPlugin,
	SubscriptPlugin,
	SuperscriptPlugin,
	UnderlinePlugin,
} from "@udecode/plate-basic-marks/react";
import { BlockquotePlugin } from "@udecode/plate-block-quote/react";
import { CodeBlockPlugin, CodeLinePlugin, CodeSyntaxPlugin } from "@udecode/plate-code-block/react";
import { CommentsPlugin } from "@udecode/plate-comments/react";
import { Value } from "@udecode/plate-common";
import { ParagraphPlugin, PlateLeaf, usePlateEditor } from "@udecode/plate-common/react";
import { DatePlugin } from "@udecode/plate-date/react";
import { ExcalidrawPlugin } from "@udecode/plate-excalidraw/react";
import { HEADING_KEYS } from "@udecode/plate-heading";
import { TocPlugin } from "@udecode/plate-heading/react";
import { HighlightPlugin } from "@udecode/plate-highlight/react";
import { HorizontalRulePlugin } from "@udecode/plate-horizontal-rule/react";
import { KbdPlugin } from "@udecode/plate-kbd/react";
import { ColumnItemPlugin, ColumnPlugin } from "@udecode/plate-layout/react";
import { LinkPlugin } from "@udecode/plate-link/react";
import { MarkdownPlugin } from "@udecode/plate-markdown";
import { ImagePlugin, MediaEmbedPlugin } from "@udecode/plate-media/react";
import { MentionInputPlugin, MentionPlugin } from "@udecode/plate-mention/react";
import { SlashInputPlugin } from "@udecode/plate-slash-command/react";
import {
	TableCellHeaderPlugin,
	TableCellPlugin,
	TablePlugin,
	TableRowPlugin,
} from "@udecode/plate-table/react";
import { TogglePlugin } from "@udecode/plate-toggle/react";
import { copilotPlugins } from "~/components/editor/plugins/copilot-plugins";
import { editorPlugins } from "~/components/editor/plugins/editor-plugins";
import { FixedToolbarPlugin } from "~/components/editor/plugins/fixed-toolbar-plugin";
import { FloatingToolbarPlugin } from "~/components/editor/plugins/floating-toolbar-plugin";
import { AILeaf } from "~/components/plate-ui/ai-leaf";
import { BlockquoteElement } from "~/components/plate-ui/blockquote-element";
import { CodeBlockElement } from "~/components/plate-ui/code-block-element";
import { CodeLeaf } from "~/components/plate-ui/code-leaf";
import { CodeLineElement } from "~/components/plate-ui/code-line-element";
import { CodeSyntaxLeaf } from "~/components/plate-ui/code-syntax-leaf";
import { ColumnElement } from "~/components/plate-ui/column-element";
import { ColumnGroupElement } from "~/components/plate-ui/column-group-element";
import { CommentLeaf } from "~/components/plate-ui/comment-leaf";
import { DateElement } from "~/components/plate-ui/date-element";
import { ExcalidrawElement } from "~/components/plate-ui/excalidraw-element";
import { HeadingElement } from "~/components/plate-ui/heading-element";
import { HighlightLeaf } from "~/components/plate-ui/highlight-leaf";
import { HrElement } from "~/components/plate-ui/hr-element";
import { ImageElement } from "~/components/plate-ui/image-element";
import { KbdLeaf } from "~/components/plate-ui/kbd-leaf";
import { LinkElement } from "~/components/plate-ui/link-element";
import { MediaEmbedElement } from "~/components/plate-ui/media-embed-element";
import { MentionElement } from "~/components/plate-ui/mention-element";
import { MentionInputElement } from "~/components/plate-ui/mention-input-element";
import { ParagraphElement } from "~/components/plate-ui/paragraph-element";
import { withPlaceholders } from "~/components/plate-ui/placeholder";
import { SlashInputElement } from "~/components/plate-ui/slash-input-element";
import { TableCellElement, TableCellHeaderElement } from "~/components/plate-ui/table-cell-element";
import { TableElement } from "~/components/plate-ui/table-element";
import { TableRowElement } from "~/components/plate-ui/table-row-element";
import { TocElement } from "~/components/plate-ui/toc-element";
import { ToggleElement } from "~/components/plate-ui/toggle-element";
import { withDraggables } from "~/components/plate-ui/with-draggables";

export const useCreateEditor = ({ initialValue }: { initialValue?: Value }) => {
	return usePlateEditor({
		override: {
			components: withDraggables(
				withPlaceholders({
					[AIPlugin.key]: AILeaf,
					[BlockquotePlugin.key]: BlockquoteElement,
					[BoldPlugin.key]: withProps(PlateLeaf, { as: "strong" }),
					[CodeBlockPlugin.key]: CodeBlockElement,
					[CodeLinePlugin.key]: CodeLineElement,
					[CodePlugin.key]: CodeLeaf,
					[CodeSyntaxPlugin.key]: CodeSyntaxLeaf,
					[ColumnItemPlugin.key]: ColumnElement,
					[ColumnPlugin.key]: ColumnGroupElement,
					[CommentsPlugin.key]: CommentLeaf,
					[DatePlugin.key]: DateElement,
					// [EmojiInputPlugin.key]: EmojiInputElement,
					[ExcalidrawPlugin.key]: ExcalidrawElement,
					[HEADING_KEYS.h1]: withProps(HeadingElement, { variant: "h1" }),
					[HEADING_KEYS.h2]: withProps(HeadingElement, { variant: "h2" }),
					[HEADING_KEYS.h3]: withProps(HeadingElement, { variant: "h3" }),
					[HEADING_KEYS.h4]: withProps(HeadingElement, { variant: "h4" }),
					[HEADING_KEYS.h5]: withProps(HeadingElement, { variant: "h5" }),
					[HEADING_KEYS.h6]: withProps(HeadingElement, { variant: "h6" }),
					[HighlightPlugin.key]: HighlightLeaf,
					[HorizontalRulePlugin.key]: HrElement,
					[ImagePlugin.key]: ImageElement,
					[ItalicPlugin.key]: withProps(PlateLeaf, { as: "em" }),
					[KbdPlugin.key]: KbdLeaf,
					[LinkPlugin.key]: LinkElement,
					[MediaEmbedPlugin.key]: MediaEmbedElement,
					[MentionInputPlugin.key]: MentionInputElement,
					[MentionPlugin.key]: MentionElement,
					[ParagraphPlugin.key]: ParagraphElement,
					[SlashInputPlugin.key]: SlashInputElement,
					[StrikethroughPlugin.key]: withProps(PlateLeaf, { as: "s" }),
					[SubscriptPlugin.key]: withProps(PlateLeaf, { as: "sub" }),
					[SuperscriptPlugin.key]: withProps(PlateLeaf, { as: "sup" }),
					[TableCellHeaderPlugin.key]: TableCellHeaderElement,
					[TableCellPlugin.key]: TableCellElement,
					[TablePlugin.key]: TableElement,
					[TableRowPlugin.key]: TableRowElement,
					[TocPlugin.key]: TocElement,
					[TogglePlugin.key]: ToggleElement,
					[UnderlinePlugin.key]: withProps(PlateLeaf, { as: "u" }),
				}),
			),
		},
		plugins: [
			...copilotPlugins,
			...editorPlugins,
			FixedToolbarPlugin,
			FloatingToolbarPlugin,
			MarkdownPlugin,
		],
		value: initialValue ?? [
			{
				children: [{ text: "Supermemory docs" }],
				type: "h1",
			},
			{
				children: [{ text: "Auto-updating AI-powered docs" }],
				type: ParagraphPlugin.key,
			},
		],
	});
};
