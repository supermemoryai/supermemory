import {
	BaseBoxShapeUtil,
	HTMLContainer,
	TLBaseShape,
	stopEventPropagation,
} from "tldraw";

type ITextCardShape = TLBaseShape<
	"Textcard",
	{ w: number; h: number; content: string; extrainfo: string; type: string }
>;

export class textCardUtil extends BaseBoxShapeUtil<ITextCardShape> {
	static override type = "Textcard" as const;

	getDefaultProps(): ITextCardShape["props"] {
		return {
			w: 100,
			h: 50,
			content: "",
			extrainfo: "",
			type: "",
		};
	}

	override canEdit = () => true;

	component(s: ITextCardShape) {
		const isEditing = this.editor.getEditingShapeId() === s.id;

		return (
			<HTMLContainer
				onPointerDown={isEditing ? stopEventPropagation : undefined}
				className={`flex h-full w-full items-center justify-center ${isEditing ? "pointer-events-auto" : "pointer-events-none"}`}
			>
				<div
					className={`overflow-hidden bg-[#232c2f] pointer-events-auto rounded-md border-2 border-[#374151] py-2 px-4
        h-[${s.props.h}]px w-[${s.props.w}]px`}
				>
					<h2 className="text-[#95A0AB]">{s.props.type}</h2>
					{isEditing ? (
						<input
							value={s.props.content}
							onChange={(e) =>
								this.editor.updateShape<ITextCardShape>({
									id: s.id,
									type: "Textcard",
									props: { content: e.currentTarget.value },
								})
							}
							onPointerDown={(e) => {
								e.stopPropagation();
							}}
							onTouchStart={(e) => {
								e.stopPropagation();
							}}
							onTouchEnd={(e) => {
								e.stopPropagation();
							}}
							className="bg-transparent block w-full text-lg font-medium border-[1px] border-[#556970]"
							type="text"
						/>
					) : (
						<h1 className="text-lg font-medium">{s.props.content}</h1>
					)}
					{isEditing ? (
						<textarea
							value={s.props.extrainfo}
							onChange={(e) =>
								this.editor.updateShape<ITextCardShape>({
									id: s.id,
									type: "Textcard",
									props: { extrainfo: e.currentTarget.value },
								})
							}
							onPointerDown={(e) => {
								e.stopPropagation();
							}}
							onTouchStart={(e) => {
								e.stopPropagation();
							}}
							onTouchEnd={(e) => {
								e.stopPropagation();
							}}
							className="bg-transparent h-full w-full text-base font-medium border-[1px] border-[#556970]"
						/>
					) : (
						<p style={{ fontSize: "15px", color: "#e5e7eb" }}>
							{s.props.extrainfo}
						</p>
					)}
				</div>
			</HTMLContainer>
		);
	}

	indicator(shape: ITextCardShape) {
		return <rect width={shape.props.w} height={shape.props.h} />;
	}
}
