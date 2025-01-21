import type { PlateRenderElementProps } from '@udecode/plate-common/react';
import type { TIndentElement } from '@udecode/plate-indent';

export const FireMarker = (
  props: Omit<PlateRenderElementProps, 'children'>
) => {
  const { element } = props;

  return (
    <div contentEditable={false}>
      <span style={{ left: -26, position: 'absolute', top: -1 }}>
        {(element as TIndentElement).indent % 2 === 0 ? '🔥' : '🚀'}
      </span>
    </div>
  );
};

export const FireLiComponent = (props: PlateRenderElementProps) => {
  const { children } = props;

  return <span>{children}</span>;
};
