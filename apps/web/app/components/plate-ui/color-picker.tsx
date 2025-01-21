'use client';

import React from 'react';

import { cn, withRef } from '@udecode/cn';
import { EraserIcon } from 'lucide-react';

import {
  type TColor,
  ColorDropdownMenuItems,
} from './color-dropdown-menu-items';
import { ColorCustom } from './colors-custom';
import { DropdownMenuGroup, DropdownMenuItem } from './dropdown-menu';

export const ColorPickerContent = withRef<
  'div',
  {
    clearColor: () => void;
    colors: TColor[];
    customColors: TColor[];
    updateColor: (color: string) => void;
    updateCustomColor: (color: string) => void;
    color?: string;
  }
>(
  (
    {
      className,
      clearColor,
      color,
      colors,
      customColors,
      updateColor,
      updateCustomColor,
      ...props
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn('flex flex-col', className)} {...props}>
        <DropdownMenuGroup label="Custom Colors">
          <ColorCustom
            color={color}
            className="px-2"
            colors={colors}
            customColors={customColors}
            updateColor={updateColor}
            updateCustomColor={updateCustomColor}
          />
        </DropdownMenuGroup>
        <DropdownMenuGroup label="Default Colors">
          <ColorDropdownMenuItems
            color={color}
            className="px-2"
            colors={colors}
            updateColor={updateColor}
          />
        </DropdownMenuGroup>
        {color && (
          <DropdownMenuGroup>
            <DropdownMenuItem className="p-2" onClick={clearColor}>
              <EraserIcon />
              <span>Clear</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}
      </div>
    );
  }
);

export const ColorPicker = React.memo(
  ColorPickerContent,
  (prev, next) =>
    prev.color === next.color &&
    prev.colors === next.colors &&
    prev.customColors === next.customColors
);
