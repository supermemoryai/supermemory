"use client";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { GlassMenuEffect } from "@/ui/glass-effect";
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
} from "@/assets/icons";
import { HeadingH3Bold } from "@/ui/heading";
import type {
	DocumentWithMemories,
	MemoryEntry,
} from "@/types";
import type { NodeDetailPanelProps } from "@/types";
import * as styles from "./node-detail-panel.css";

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
  		{/*@ts-ignore */}
			return <FileText {...iconProps} />;
	}
};

export const NodeDetailPanel = memo(
	function NodeDetailPanel({ node, onClose, variant = "console" }: NodeDetailPanelProps) {
		if (!node) return null;

		const isDocument = node.type === "document";
		const data = node.data;

		return (
			<motion.div
				animate={{ opacity: 1 }}
				className={styles.container}
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				transition={{
					duration: 0.2,
					ease: "easeInOut",
				}}
			>
				{/* Glass effect background */}
				<GlassMenuEffect rounded="xl" />

				<motion.div
					animate={{ opacity: 1 }}
					className={styles.content}
					initial={{ opacity: 0 }}
					transition={{ delay: 0.05, duration: 0.15 }}
				>
					<div className={styles.header}>
						<div className={styles.headerLeft}>
							{isDocument ? (
								getDocumentIcon((data as DocumentWithMemories).type ?? "")
							) : (
							// @ts-ignore
								<Brain className={styles.headerIconMemory} />
							)}
							<HeadingH3Bold>
								{isDocument ? "Document" : "Memory"}
							</HeadingH3Bold>
						</div>
						<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
							<Button
								className={styles.closeButton}
								onClick={onClose}
								size="sm"
								variant="ghost"
							>
  							{/* @ts-ignore */}
								<X className={styles.closeIcon} />
							</Button>
						</motion.div>
					</div>

					<div className={styles.sections}>
						{isDocument ? (
							<>
								<div className={styles.section}>
									<span className={styles.sectionLabel}>
										Title
									</span>
									<p className={styles.sectionValue}>
										{(data as DocumentWithMemories).title ||
											"Untitled Document"}
									</p>
								</div>

								{(data as DocumentWithMemories).summary && (
									<div className={styles.section}>
										<span className={styles.sectionLabel}>
											Summary
										</span>
										<p className={styles.sectionValueTruncated}>
											{(data as DocumentWithMemories).summary}
										</p>
									</div>
								)}

								<div className={styles.section}>
									<span className={styles.sectionLabel}>
										Type
									</span>
									<p className={styles.sectionValue}>
										{formatDocumentType((data as DocumentWithMemories).type ?? "")}
									</p>
								</div>

								<div className={styles.section}>
									<span className={styles.sectionLabel}>
										Memory Count
									</span>
									<p className={styles.sectionValue}>
										{(data as DocumentWithMemories).memoryEntries.length}{" "}
										memories
									</p>
								</div>

								{((data as DocumentWithMemories).url ||
									(data as DocumentWithMemories).customId) && (
									<div className={styles.section}>
										<span className={styles.sectionLabel}>
											URL
										</span>
										<a
											className={styles.link}
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
											{/* @ts-ignore */}
											<ExternalLink className={styles.linkIcon} />
											View Document
										</a>
									</div>
								)}
							</>
						) : (
							<>
								<div className={styles.section}>
									<span className={styles.sectionLabel}>
										Memory
									</span>
									<p className={styles.sectionValue}>
										{(data as MemoryEntry).memory}
									</p>
									{(data as MemoryEntry).isForgotten && (
										<Badge className={styles.badge} variant="destructive">
											Forgotten
										</Badge>
									)}
									{(data as MemoryEntry).forgetAfter && (
										<p className={styles.expiryText}>
											Expires:{" "}
											{(data as MemoryEntry).forgetAfter
												? new Date(
														(data as MemoryEntry).forgetAfter!,
													).toLocaleDateString()
												: ""}{" "}
											{("forgetReason" in data &&
												(data as any).forgetReason
												? `- ${(data as any).forgetReason}`
												: null)}
										</p>
									)}
								</div>

								<div className={styles.section}>
									<span className={styles.sectionLabel}>
										Space
									</span>
									<p className={styles.sectionValue}>
										{(data as MemoryEntry).spaceId || "Default"}
									</p>
								</div>
							</>
						)}

						<div className={styles.footer}>
							<div className={styles.metadata}>
								<span className={styles.metadataItem}>
									{/* @ts-ignore */}
									<Calendar className={styles.metadataIcon} />
									{new Date(data.createdAt).toLocaleDateString()}
								</span>
								<span className={styles.metadataItem}>
								  {/* @ts-ignore */}
									<Hash className={styles.metadataIcon} />
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
