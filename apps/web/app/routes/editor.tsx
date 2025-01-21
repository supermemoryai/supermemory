import { lazy, memo } from "react";

import { OpenAIProvider } from "~/components/editor/use-chat";

const PlateEditorImport = lazy(() =>
	import("~/components/editor/plate-editor").then((mod) => ({ default: mod.PlateEditor })),
);

const PlateEditor = memo(PlateEditorImport);

export default function Page() {
	return (
		<div className="h-screen w-full" data-registry="plate">
			<OpenAIProvider>
				<PlateEditor />
			</OpenAIProvider>
		</div>
	);
}
