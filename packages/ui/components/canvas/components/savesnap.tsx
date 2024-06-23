import { useCallback, useEffect, useState } from "react";
import { debounce, useEditor } from "tldraw";

export function SaveStatus() {
  const [save, setSave] = useState("saved!");
  const editor = useEditor();

  const debouncedSave = useCallback(
    debounce(async () => {
      const snapshot = editor.store.getSnapshot();
      localStorage.setItem("saved", JSON.stringify(snapshot));

      const res = await fetch(
        "https://learning-cf.pruthvirajthinks.workers.dev/post/page3",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: snapshot,
          }),
        },
      );

      console.log(await res.json());
      setSave("saved!");
    }, 3000),
    [editor], // Dependency array ensures the function is not recreated on every render
  );

  useEffect(() => {
    const unsubscribe = editor.store.listen(
      () => {
        setSave("saving...");
        debouncedSave();
      },
      { scope: "document", source: "user" },
    );

    return () => unsubscribe(); // Cleanup on unmount
  }, [editor, debouncedSave]);

  return <button>{save}</button>;
}