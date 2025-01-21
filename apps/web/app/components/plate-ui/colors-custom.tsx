'use client';

import React, { type ComponentPropsWithoutRef } from 'react';

import { cn } from '@udecode/cn';
import {
  useColorsCustom,
  useColorsCustomState,
} from '@udecode/plate-font/react';
import { PlusIcon } from 'lucide-react';

import { buttonVariants } from './button';
import {
  type TColor,
  ColorDropdownMenuItems,
} from './color-dropdown-menu-items';
import { ColorInput } from './color-input';

// import { ColorInput } from './color-input';
import { DropdownMenuItem } from './dropdown-menu';

type ColorCustomProps = {
  colors: TColor[];
  customColors: TColor[];
  updateColor: (color: string) => void;
  updateCustomColor: (color: string) => void;
  color?: string;
} & ComponentPropsWithoutRef<'div'>;

export function ColorCustom({
  className,
  color,
  colors,
  customColors,
  updateColor,
  updateCustomColor,
  ...props
}: ColorCustomProps) {
  const state = useColorsCustomState({
    color,
    colors,
    customColors,
    updateCustomColor,
  });
  const { inputProps, menuItemProps } = useColorsCustom(state);

  return (
    <div className={cn('relative flex flex-col gap-4', className)} {...props}>
      <ColorDropdownMenuItems
        color={color}
        colors={state.computedColors}
        updateColor={updateColor}
      >
        <ColorInput {...inputProps}>
          <DropdownMenuItem
            className={cn(
              buttonVariants({
                isMenu: true,
                size: 'icon',
                variant: 'outline',
              }),
              'absolute bottom-2 right-2 top-1.5 flex size-7 items-center justify-center rounded-full'
            )}
            {...menuItemProps}
          >
            <span className="sr-only">Custom</span>
            <PlusIcon />
          </DropdownMenuItem>
        </ColorInput>
      </ColorDropdownMenuItems>
    </div>
  );
}
