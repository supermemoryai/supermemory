'use client';

import {
  cn,
  createPrimitiveComponent,
  withCn,
  withVariants,
} from '@udecode/cn';
import {
  Caption as CaptionPrimitive,
  CaptionTextarea as CaptionTextareaPrimitive,
  useCaptionButton,
  useCaptionButtonState,
} from '@udecode/plate-caption/react';
import { cva } from 'class-variance-authority';

import { Button } from './button';

const captionVariants = cva('max-w-full', {
  defaultVariants: {
    align: 'center',
  },
  variants: {
    align: {
      center: 'mx-auto',
      left: 'mr-auto',
      right: 'ml-auto',
    },
  },
});

export const Caption = withVariants(CaptionPrimitive, captionVariants, [
  'align',
]);

export const CaptionTextarea = withCn(
  CaptionTextareaPrimitive,
  cn(
    'mt-2 w-full resize-none border-none bg-inherit p-0 font-[inherit] text-inherit',
    'focus:outline-none focus:[&::placeholder]:opacity-0',
    'text-center print:placeholder:text-transparent'
  )
);

export const CaptionButton = createPrimitiveComponent(Button)({
  propsHook: useCaptionButton,
  stateHook: useCaptionButtonState,
});
