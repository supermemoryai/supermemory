"use client";

import { cn } from "@repo/lib/utils";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { GlassMenuEffect } from "@repo/ui/other/glass-effect";
import { Brain, Calendar, ExternalLink, FileText, Hash, X } from "lucide-react";
import { motion } from "motion/react";
import { memo } from "react";
import {
	GoogleDocs,
	GoogleDrive,
	GoogleSheets,
	GoogleSlides,
	MicrosoftExcel,
	MicrosoftOneNote,
	MicrosoftPowerpoint,
	MicrosoftWord,
	NotionDoc,
	OneDrive,
	PDF,
} from "../assets/icons";
import { HeadingH3Bold } from "../text/heading/heading-h3-bold";
import type {
	DocumentWithMemories,
	MemoryEntry,
	NodeDetailPanelProps,
} from "./types";

const formatDocumentType = (type: string) => {
	// Special case for PDF
	if (type.toLowerCase() === "pdf") return "PDF";

	// Replace underscores with spaces and capitalize each word
	return type
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
};

const getDocumentIcon = (type: string) => {
	const iconProps = { className: "w-5 h-5 text-slate-300" };

	switch (type) {
		case "google_doc":
			return <GoogleDocs {...iconProps} />;
		case "google_sheet":
			return <GoogleSheets {...iconProps} />;
		case "google_slide":
			return <GoogleSlides {...iconProps} />;
		case "google_drive":
			return <GoogleDrive {...iconProps} />;
		case "notion":
		case "notion_doc":
			return <NotionDoc {...iconProps} />;
		case "word":
		case "microsoft_word":
			return <MicrosoftWord {...iconProps} />;
		case "excel":
		case "microsoft_excel":
			return <MicrosoftExcel {...iconProps} />;
		case "powerpoint":
		case "microsoft_powerpoint":
			return <MicrosoftPowerpoint {...iconProps} />;
		case "onenote":
		case "microsoft_onenote":
			return <MicrosoftOneNote {...iconProps} />;
		case "onedrive":
			return <OneDrive {...iconProps} />;
		case "pdf":
			return <PDF {...iconProps} />;
		default:
			return <FileText {...iconProps} />;
	}
};

export const NodeDetailPanel = memo<NodeDetailPanelProps>(
	({ node, onClose, variant = "console" }) => {
		// Use explicit classes that Tailwind can detect
		const getPositioningClasses = () => {
			// Both variants use the same positioning for nodeDetail
			return "top-4 right-4";
		};

		if (!node) return null;

		const isDocument = node.type === "document";
		const data = node.data;

		return (
			<motion.div
				animate={{ opacity: 1 }}
				className={cn(
					"absolute w-80 rounded-xl overflow-hidden z-20 max-h-[80vh]",
					getPositioningClasses(),
				)}
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				transition={{
					duration: 0.2,
					ease: "easeInOut",
				}}
			>
				{/* Glass effect background */}
				<GlassMenuEffect rounded="rounded-xl" />

				<motion.div
					animate={{ opacity: 1 }}
					className="relative z-10 p-4 overflow-y-auto max-h-[80vh]"
					initial={{ opacity: 0 }}
					transition={{ delay: 0.05, duration: 0.15 }}
				>
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-2">
							{isDocument ? (
								getDocumentIcon((data as DocumentWithMemories).type)
							) : (
								<Brain className="w-5 h-5 text-blue-400" />
							)}
							<HeadingH3Bold className="text-slate-100">
								{isDocument ? "Document" : "Memory"}
							</HeadingH3Bold>
						</div>
						<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
							<Button
								className="h-8 w-8 p-0 text-slate-300 hover:text-slate-100"
								onClick={onClose}
								size="sm"
								variant="ghost"
							>
								<X className="w-4 h-4" />
							</Button>
						</motion.div>
					</div>

					<div className="space-y-3">
						{isDocument ? (
							<>
								<div>
									<span className="text-xs text-slate-400 uppercase tracking-wide">
										Title
									</span>
									<p className="text-sm text-slate-200 mt-1">
										{(data as DocumentWithMemories).title ||
											"Untitled Document"}
									</p>
								</div>

								{(data as DocumentWithMemories).summary && (
									<div>
										<span className="text-xs text-slate-400 uppercase tracking-wide">
											Summary
										</span>
										<p className="text-sm text-slate-300 mt-1 line-clamp-3">
											{(data as DocumentWithMemories).summary}
										</p>
									</div>
								)}

								<div>
									<span className="text-xs text-slate-400 uppercase tracking-wide">
										Type
									</span>
									<p className="text-sm text-slate-200 mt-1">
										{formatDocumentType((data as DocumentWithMemories).type)}
									</p>
								</div>

								<div>
									<span className="text-xs text-slate-400 uppercase tracking-wide">
										Memory Count
									</span>
									<p className="text-sm text-slate-200 mt-1">
										{(data as DocumentWithMemories).memoryEntries.length}{" "}
										memories
									</p>
								</div>

								{((data as DocumentWithMemories).url ||
									(data as DocumentWithMemories).customId) && (
									<div>
										<span className="text-xs text-slate-400 uppercase tracking-wide">
											URL
										</span>
										<a
											className="text-sm text-indigo-400 hover:text-indigo-300 mt-1 flex items-center gap-1"
											href={(() => {
												const doc = data as DocumentWithMemories;
												if (doc.type === "google_doc" && doc.customId) {
													return `https://docs.google.com/document/d/${doc.customId}`;
												}
												if (doc.type === "google_sheet" && doc.customId) {
													return `https://docs.google.com/spreadsheets/d/${doc.customId}`;
												}
												if (doc.type === "google_slide" && doc.customId) {
													return `https://docs.google.com/presentation/d/${doc.customId}`;
												}
												return doc.url ?? undefined;
											})()}
											rel="noopener noreferrer"
											target="_blank"
										>
											<ExternalLink className="w-3 h-3" />
											View Document
										</a>
									</div>
								)}
							</>
						) : (
							<>
								<div>
									<span className="text-xs text-slate-400 uppercase tracking-wide">
										Memory
									</span>
									<p className="text-sm text-slate-200 mt-1">
										{(data as MemoryEntry).memory}
									</p>
									{(data as MemoryEntry).isForgotten && (
										<Badge className="mt-2" variant="destructive">
											Forgotten
										</Badge>
									)}
									{(data as MemoryEntry).forgetAfter && (
										<p className="text-xs text-slate-400 mt-1">
											Expires:{" "}
											{(data as MemoryEntry).forgetAfter
												? new Date(
														(data as MemoryEntry).forgetAfter!,
													).toLocaleDateString()
												: ""}{" "}
											{"forgetReason" in data &&
												data.forgetReason &&
												`- ${data.forgetReason}`}
										</p>
									)}
								</div>

								<div>
									<span className="text-xs text-slate-400 uppercase tracking-wide">
										Space
									</span>
									<p className="text-sm text-slate-200 mt-1">
										{(data as MemoryEntry).spaceId || "Default"}
									</p>
								</div>
							</>
						)}

						<div className="pt-2 border-t border-slate-700/50">
							<div className="flex items-center gap-4 text-xs text-slate-400">
								<span className="flex items-center gap-1">
									<Calendar className="w-3 h-3" />
									{new Date(data.createdAt).toLocaleDateString()}
								</span>
								<span className="flex items-center gap-1">
									<Hash className="w-3 h-3" />
									{node.id}
								</span>
							</div>
						</div>
					</div>
				</motion.div>
			</motion.div>
		);
	},
);

NodeDetailPanel.displayName = "NodeDetailPanel";
