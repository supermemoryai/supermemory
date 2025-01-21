'use client';


import { withRef } from '@udecode/cn';
import { useCodeSyntaxLeaf } from '@udecode/plate-code-block/react';
import { PlateLeaf } from '@udecode/plate-common/react';

export const CodeSyntaxLeaf = withRef<typeof PlateLeaf>(
  ({ children, ...props }, ref) => {
    const { leaf } = props;

    const { tokenProps } = useCodeSyntaxLeaf({ leaf });

    return (
      <PlateLeaf ref={ref} {...props}>
        <span {...tokenProps}>{children}</span>
      </PlateLeaf>
    );
  }
);
