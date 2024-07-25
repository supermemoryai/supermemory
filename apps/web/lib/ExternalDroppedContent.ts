import {
  AssetRecordType,
  Editor,
  TLAsset,
  TLAssetId,
  TLBookmarkShape,
  TLExternalContentSource,
  TLShapePartial,
  Vec,
  VecLike,
  createShapeId,
  getEmbedInfo,
  getHashForString,
} from "tldraw";
import { unfirlSite } from "@/app/actions/fetchers";

export default async function createEmbedsFromUrl({
  url,
  point,
  sources,
  editor,
}: {
  url: string;
  point?: VecLike | undefined;
  sources?: TLExternalContentSource[] | undefined;
  editor: Editor;
}) {
  const position =
    point ??
    (editor.inputs.shiftKey
      ? editor.inputs.currentPagePoint
      : editor.getViewportPageBounds().center);

  const urlPattern = /https?:\/\/(x\.com|twitter\.com)\/[\w]+\/[\w]+\/[\d]+/;
  if (urlPattern.test(url)) {
    return editor.createShape({
      type: "Twittercard",
      x: position.x - 250,
      y: position.y - 150,
      props: { url: url },
    });
  }

  // try to paste as an embed first
  const embedInfo = getEmbedInfo(url);

  if (embedInfo) {
    return editor.putExternalContent({
      type: "embed",
      url: embedInfo.url,
      point,
      embed: embedInfo.definition,
    });
  }

  const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url));
  const shape = createEmptyBookmarkShape(editor, url, position);

  let asset = editor.getAsset(assetId) as TLAsset;
  let shouldAlsoCreateAsset = false;
  if (!asset) {
    shouldAlsoCreateAsset = true;
    try {
      const bookmarkAsset = await editor.getAssetForExternalContent({
        type: "url",
        url,
      });
      const value = await unfirlSite(url);
      if (bookmarkAsset) {
        if (bookmarkAsset.type === "bookmark" ){
          if (value.title  ) bookmarkAsset.props.title = value.title;
          if (value.image) bookmarkAsset.props.image = value.image;
          if (value.description)
            bookmarkAsset.props.description = value.description;
        }
      }
      if (!bookmarkAsset) throw Error("Could not create an asset");
      asset = bookmarkAsset;
    } catch (e) {
      console.log(e);
      return;
    }
  }

  editor.batch(() => {
    if (shouldAlsoCreateAsset) {
      editor.createAssets([asset]);
    }

    editor.updateShapes([
      {
        id: shape.id,
        type: shape.type,
        props: {
          assetId: asset.id,
        },
      },
    ]);
  });
}

function processURL(input: string): string | null {
  let str = input.trim();
  if (!/^(?:f|ht)tps?:\/\//i.test(str)) {
    str = "http://" + str;
  }
  try {
    const url = new URL(str);
    return url.href;
  } catch {
    return str.match(
      /^(https?:\/\/)?(www\.)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(\/.*)?$/i
    )
      ? str
      : null;
  }
}

function formatTextToRatio(text: string): { height: number; width: number } {
  const RATIO = 4 / 3; 
  const FONT_SIZE = 15;
  const CHAR_WIDTH = FONT_SIZE * 0.6; 
  const LINE_HEIGHT = FONT_SIZE * 1.2;
  const MIN_WIDTH = 200; 

  let width = Math.min(
    800,
    Math.max(MIN_WIDTH, Math.ceil(text.length * CHAR_WIDTH))
  );

  width = Math.ceil(width / 4) * 4;

  const maxLineWidth = Math.floor(width / CHAR_WIDTH);

  const words = text.split(" ");
  let lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    if ((currentLine + word).length <= maxLineWidth) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) {
    lines.push(currentLine);
  }

  let height = Math.ceil(lines.length * LINE_HEIGHT);

  if (width / height > RATIO) {
    width = Math.ceil(height * RATIO);
  } else {
    height = Math.ceil(width / RATIO);
  }

  return { height, width };
}

type CardData = {
  type: string;
  title: string;
  content: string;
  url: string;
};

type DroppedData = CardData | string | { imageUrl: string };

export function handleExternalDroppedContent({
  droppedData,
  editor,
}: {
  droppedData: DroppedData;
  editor: Editor;
}) {
  const position = editor.inputs.shiftKey
    ? editor.inputs.currentPagePoint
    : editor.getViewportPageBounds().center;

  if (typeof droppedData === "string") {
    const processedURL = processURL(droppedData);
    if (processedURL) {
      createEmbedsFromUrl({ editor, url: processedURL });
      return;
    } else {
      const { height, width } = formatTextToRatio(droppedData);
      editor.createShape({
        type: "Textcard",
        x: position.x - width / 2,
        y: position.y - height / 2,
        props: {
          content: "",
          extrainfo: droppedData,
          type: "note",
          w: 300,
          h: 200,
        },
      });
    }
  } else if ("imageUrl" in droppedData) {
  } else {
    const { content, title, url, type } = droppedData;
    const processedURL = processURL(url);
    if (processedURL) {
      createEmbedsFromUrl({ editor, url: processedURL });
      return;
    }
    const { height, width } = formatTextToRatio(content);

    editor.createShape({
      type: "Textcard",
      x: position.x - 250,
      y: position.y - 150,
      props: {
        type,
        content: title,
        extrainfo: content,
        w: height,
        h: width,
      },
    });
  }
}

function centerSelectionAroundPoint(editor: Editor, position: VecLike) {
  // Re-position shapes so that the center of the group is at the provided point
  const viewportPageBounds = editor.getViewportPageBounds();
  let selectionPageBounds = editor.getSelectionPageBounds();

  if (selectionPageBounds) {
    const offset = selectionPageBounds!.center.sub(position);

    editor.updateShapes(
      editor.getSelectedShapes().map((shape) => {
        const localRotation = editor
          .getShapeParentTransform(shape)
          .decompose().rotation;
        const localDelta = Vec.Rot(offset, -localRotation);
        return {
          id: shape.id,
          type: shape.type,
          x: shape.x! - localDelta.x,
          y: shape.y! - localDelta.y,
        };
      })
    );
  }

  // Zoom out to fit the shapes, if necessary
  selectionPageBounds = editor.getSelectionPageBounds();
  if (
    selectionPageBounds &&
    !viewportPageBounds.contains(selectionPageBounds)
  ) {
    editor.zoomToSelection();
  }
}

export function createEmptyBookmarkShape(
  editor: Editor,
  url: string,
  position: VecLike
): TLBookmarkShape {
  const partial: TLShapePartial = {
    id: createShapeId(),
    type: "bookmark",
    x: position.x - 150,
    y: position.y - 160,
    opacity: 1,
    props: {
      assetId: null,
      url,
    },
  };

  editor.batch(() => {
    editor.createShapes([partial]).select(partial.id);
    centerSelectionAroundPoint(editor, position);
  });

  return editor.getShape(partial.id) as TLBookmarkShape;
}
