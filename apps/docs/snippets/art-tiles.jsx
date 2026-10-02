import { Icon } from "@holocron.so/vite/mdx"

export const ArtTile = ({
	title,
	href,
	art,
	pos = "center",
	flip,
	children,
}) => (
	<a
		className="sm-card sm-art-card group"
		href={
			href.startsWith("/")
				? `${import.meta.env.BASE_URL}${href.slice(1)}`
				: href
		}
	>
		<div className="sm-card-media sm-art-media">
			<img
				src={`${import.meta.env.BASE_URL}${art.slice(1)}`}
				alt=""
				style={{ objectPosition: pos, "--flip": flip ? -1 : 1 }}
			/>
			<div className="sm-art-wash" />
			<div className="sm-scene" aria-hidden="true">
				{children}
			</div>
		</div>
		<div className="sm-card-body">
			<div className="sm-card-title">
				<span>{title}</span>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M5 12h14M13 6l6 6-6 6" />
				</svg>
			</div>
		</div>
	</a>
)

export const At = ({ x, y, w, className, children }) => (
	<div className={className} style={{ left: x, top: y, width: w }}>
		{children}
	</div>
)

export const Tile = ({
	x,
	y,
	size = 36,
	src,
	icon,
	logo,
	on,
	faded,
	badge,
}) => (
	<div
		className={
			"m m-tile" +
			(src ? (logo ? " is-logo" : " is-app") : "") +
			(on ? " is-on" : "") +
			(faded ? " is-faded" : "")
		}
		style={{
			left: x,
			top: y,
			width: size,
			height: size,
			padding: logo ? Math.round(size * 0.22) : 0,
		}}
	>
		{src ? (
			<img src={`${import.meta.env.BASE_URL}${src.slice(1)}`} alt="" />
		) : (
			<Icon icon={icon} size={Math.round(size * 0.45)} />
		)}
		{badge ? (
			<span className="m-badge">
				<Icon icon="/icons/hugeicons/tick-02.svg" size={9} />
			</span>
		) : null}
	</div>
)

export const Lines = ({ d }) => (
	<svg className="m-lines" viewBox="0 0 264 152" aria-hidden="true">
		{d.map((path) => (
			<path key={path} d={path} />
		))}
	</svg>
)
