import {
	BaseBoxShapeUtil,
	HTMLContainer,
	TLBaseShape,
	toDomPrecision,
} from "tldraw";

type ITwitterCardShape = TLBaseShape<
	"Twittercard",
	{ w: number; h: number; url: string }
>;

export class twitterCardUtil extends BaseBoxShapeUtil<ITwitterCardShape> {
	static override type = "Twittercard" as const;

	getDefaultProps(): ITwitterCardShape["props"] {
		return {
			w: 500,
			h: 550,
			url: "",
		};
	}

	component(s: ITwitterCardShape) {
		return (
			<HTMLContainer className="flex h-full w-full items-center justify-center">
				<TwitterPost
					url={s.props.url}
					width={s.props.w}
					isInteractive={false}
					height={s.props.h}
				/>
			</HTMLContainer>
		);
	}

	indicator(shape: ITwitterCardShape) {
		return <rect width={shape.props.w} height={shape.props.h} />;
	}
}

function TwitterPost({
	isInteractive,
	width,
	height,
	url,
}: {
	isInteractive: boolean;
	width: number;
	height: number;
	url: string;
}) {
	const link = (() => {
		try {
			const urlObj = new URL(url);
			const path = urlObj.pathname;
			return path;
		} catch (error) {
			console.error("Invalid URL", error);
			return null;
		}
	})();

	return (
		<iframe
			className="tl-embed"
			draggable={false}
			width={toDomPrecision(width)}
			height={toDomPrecision(height)}
			seamless
			referrerPolicy="no-referrer-when-downgrade"
			style={{
				pointerEvents: isInteractive ? "all" : "none",
				zIndex: isInteractive ? "" : "-1",
			}}
			srcDoc={`
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document</title>
        </head>
        <body>
          <blockquote data-theme="dark" class="twitter-tweet"><p lang="en" dir="ltr"><a href="https://twitter.com${link}"></a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
        </body>
        </html>`}
		/>
	);
}
