import { Icon } from "@holocron.so/vite/mdx"

export const HomeLink = ({ href, icon, children }) => (
	<a
		className="sm-home-link"
		href={`${import.meta.env.BASE_URL}${href.slice(1)}`}
	>
		<span className="sm-home-link-icon">
			<Icon icon={icon} size={12} />
		</span>
		<span>{children}</span>
	</a>
)

export const PathCard = ({ title, description, href, image, children }) => (
	<div className="sm-home-card">
		<a
			className="sm-home-card-media"
			href={`${import.meta.env.BASE_URL}${href.slice(1)}`}
			aria-label={title}
		>
			<img src={`${import.meta.env.BASE_URL}${image.slice(1)}`} alt="" />
		</a>
		<div className="sm-home-card-body">
			<a
				className="sm-home-card-title"
				href={`${import.meta.env.BASE_URL}${href.slice(1)}`}
			>
				{title}
			</a>
			<p className="sm-home-card-desc">{description}</p>
			<div className="sm-home-links">{children}</div>
		</div>
	</div>
)

export const ListCard = ({ title, children }) => (
	<div className="sm-home-card sm-home-list-card">
		<div className="sm-home-card-body">
			<div className="sm-home-card-title">{title}</div>
			<div className="sm-home-links">{children}</div>
		</div>
	</div>
)
