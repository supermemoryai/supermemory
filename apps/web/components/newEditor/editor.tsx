import React, { useEffect, useRef } from "react";
import EditorJS, { ToolConstructable } from "@editorjs/editorjs";
//@ts-ignore
import CheckList from "@editorjs/checklist";
//@ts-ignore
import Code from "@editorjs/code";
import Delimiter from "@editorjs/delimiter";
//@ts-ignore
import Embed from "@editorjs/embed";
import ImageTool from "@editorjs/image";
//@ts-ignore
import InlineCode from "@editorjs/inline-code";
import List from "@editorjs/list";
import Quote from "@editorjs/quote";
//@ts-ignore
import Table from "@editorjs/table";
//@ts-ignore
import Paragraph from "@editorjs/paragraph";
import Header from "@editorjs/header";
//@ts-ignore
import Raw from "@editorjs/raw";
//@ts-ignore
import LinkTool from "@editorjs/link";
interface EditorJSEditorProps {
	setContent: (content: string) => void;
	data: any;
	holder: string;
}

const EDITOR_TOOLS = {
	code: Code,
	header: {
		class: Header as unknown as ToolConstructable,
		shortcut: "CMD+H",
		inlineToolbar: true,
		config: {
			placeholder: "Enter a Header",
			levels: [2, 3, 4],
			defaultLevel: 2,
		},
	},
	paragraph: {
		class: Paragraph,
		// shortcut: 'CMD+P',
		inlineToolbar: true,
	},
	checklist: CheckList,
	inlineCode: InlineCode,
	table: Table,
	list: List,
	quote: Quote,
	delimiter: Delimiter,
	raw: Raw,
	linkTool: {
		class: LinkTool,
		config: {
			endpoint: "http://localhost:3000/", //Currently, the plugin's design supports the 'title', 'image', and 'description' fields. They should have the following format in the response:
		},
	},
	image: {
		class: ImageTool as unknown as ToolConstructable,
		config: {
			endpoints: {
				byFile: "http://localhost:8008/uploadFile", // Your backend file uploader endpoint
				byUrl: "http://localhost:8008/fetchUrl", // Your endpoint that provides uploading by Url
			},
		},
	},
};

const EditorJSEditor: React.FC<EditorJSEditorProps> = ({
	setContent,
	holder,
	data,
}) => {
	const editorRef = useRef<EditorJS | null>(null);
	// const [editorData, setEditorData] = useState<OutputData | undefined>(
	// 	initialData,
	// );
	useEffect(() => {
		if (!editorRef.current) {
			editorRef.current = new EditorJS({
				holder: holder,
				placeholder: "Start writing here....",
				tools: {
					...EDITOR_TOOLS,
				},
				onChange: async () => {
					const content = await editorRef.current?.save();
					setContent(JSON.stringify(content));
				},
			});
		}

		return () => {
			if (editorRef.current && editorRef.current.destroy) {
				editorRef.current.destroy();
			}
		};
	}, [setContent, holder]);
	
	return <div className="prose prose-lg dark:prose-invert max-w-full" />;
};

export default EditorJSEditor;
