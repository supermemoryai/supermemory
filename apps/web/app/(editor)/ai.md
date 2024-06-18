## to access the editor
```
import { useEditor } from "novel";
const editor = useEditor()
```

## to get previous text
```
import { getPrevText } from "novel/utils";
const pos = editor.state.selection.from;
const text = getPrevText(editor, pos);
```

## selected content into markdown format 
```
const slice = editor.state.selection.content();
const text = editor.storage.markdown.serializer.serialize(slice.content);
```

## replace Selection 
```
const selection = editor.view.state.selection;
editor.chain().focus()
  .insertContentAt(
    {
      from: selection.from,
      to: selection.to,
    },
    completion,
  )
  .run();
```


## to insert after
```
const selection = editor.view.state.selection;
editor
  .chain()
  .focus()
  .insertContentAt(selection.to + 1, completion)
  .run();
```
