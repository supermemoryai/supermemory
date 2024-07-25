import { useEditor } from 'novel';
import React from 'react'

function SuperscriptSelector() {
  const { editor } = useEditor();
  if (!editor) return null;

  return (
    <button
    onClick={() => editor.chain().focus().setSuperscript().run()}
    disabled={editor.isActive('superscript')}
    >Super</button>
  )
}

export default SuperscriptSelector