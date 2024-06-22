import { BaseBoxShapeUtil, HTMLContainer, TLBaseBoxShape, TLBaseShape, useIsEditing, useValue } from "tldraw";

type ITextCardShape = TLBaseShape<
  "Textcard",
  { w: number; h: number; content: string; extrainfo: string }
>;

export class textCardUtil extends BaseBoxShapeUtil<ITextCardShape> {
  static override type = "Textcard" as const;

  getDefaultProps(): ITextCardShape["props"] {
    return {
      w: 100,
      h: 50,
      content: "",
      extrainfo: "",
    };
  }

  component(s: ITextCardShape) {

    const isEditing = useIsEditing(s.id)
    const isHoveringWhileEditingSameShape = useValue(
      'is hovering',
      () => {
        const { editingShapeId, hoveredShapeId } = this.editor.getCurrentPageState()
  
        if (editingShapeId && hoveredShapeId !== editingShapeId) {
          const editingShape = this.editor.getShape(editingShapeId)
          if (editingShape && this.editor.isShapeOfType<TLBaseBoxShape>(editingShape, 'embed')) {
            return true
          }
        }
  
        return false
      },
      []
    )

    const isInteractive = isEditing || isHoveringWhileEditingSameShape
    return (
      <HTMLContainer className="flex h-full w-full items-center justify-center">
        <div
          style={{
            height: s.props.h,
            width: s.props.w,
            pointerEvents: isInteractive ? "all" : "none",
            zIndex: isInteractive ? "" : "-1",
            background: "#2C3439",
            borderRadius: "16px",
            padding: "8px 14px"
          }}
        >
          <h1 style={{ fontSize: "15px" }}>{s.props.content}</h1>
          <p style={{ fontSize: "14px", color: "#369DFD" }}>
            {s.props.extrainfo}
          </p>
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: ITextCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
