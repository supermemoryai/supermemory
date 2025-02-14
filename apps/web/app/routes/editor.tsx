import { lazy, memo } from "react";

const WritingPlaygroundImport = lazy(() =>
	import("~/components/editor/writing-playground").then((mod) => ({
		default: mod.WritingPlayground,
	})),
);

const WritingPlayground = memo(WritingPlaygroundImport);

export default function Page() {
	return <WritingPlayground />;
}
