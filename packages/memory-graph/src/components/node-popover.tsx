"use client"

import { memo } from "react"
import type { GraphNode } from "@/types"

export interface NodePopoverProps {
	node: GraphNode
	x: number // Screen X position
	y: number // Screen Y position
	onClose: () => void
}

export const NodePopover = memo<NodePopoverProps>(function NodePopover({
	node,
	x,
	y,
	onClose,
}) {
	return (
		<>
			{/* Invisible backdrop to catch clicks outside */}
			<div
				onClick={onClose}
				style={{
					position: "fixed",
					inset: 0,
					zIndex: 999,
					pointerEvents: "auto",
				}}
			/>

			{/* Popover content */}
			<div
				onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
				style={{
					position: "fixed",
					left: `${x}px`,
					top: `${y}px`,
					background: "rgba(255, 255, 255, 0.05)",
					backdropFilter: "blur(12px)",
					WebkitBackdropFilter: "blur(12px)",
					border: "1px solid rgba(255, 255, 255, 0.25)",
					borderRadius: "12px",
					padding: "16px",
					width: "320px",
					zIndex: 1000,
					pointerEvents: "auto",
					boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)",
				}}
			>
				{node.type === "document" ? (
					// Document popover
					<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
						{/* Header */}
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(148, 163, 184, 1)" }}>
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
									<polyline points="14 2 14 8 20 8"></polyline>
									<line x1="16" y1="13" x2="8" y2="13"></line>
									<line x1="16" y1="17" x2="8" y2="17"></line>
									<polyline points="10 9 9 9 8 9"></polyline>
								</svg>
								<h3 style={{
									fontSize: "16px",
									fontWeight: "700",
									color: "white",
									margin: 0,
								}}>
									Document
								</h3>
							</div>
							<button
								type="button"
								onClick={onClose}
								style={{
									padding: "4px",
									background: "transparent",
									border: "none",
									color: "rgba(148, 163, 184, 1)",
									cursor: "pointer",
									fontSize: "16px",
									lineHeight: "1",
									transition: "color 0.2s",
								}}
								onMouseEnter={(e) => e.currentTarget.style.color = "white"}
								onMouseLeave={(e) => e.currentTarget.style.color = "rgba(148, 163, 184, 1)"}
							>
								×
							</button>
						</div>

						{/* Sections */}
						<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
							{/* Title */}
							<div>
								<div style={{
									fontSize: "11px",
									color: "rgba(148, 163, 184, 0.8)",
									textTransform: "uppercase",
									letterSpacing: "0.05em",
									marginBottom: "4px",
								}}>
									Title
								</div>
								<p style={{
									fontSize: "14px",
									color: "rgba(203, 213, 225, 1)",
									margin: 0,
									lineHeight: "1.4",
								}}>
									{(node.data as any).title || "Untitled Document"}
								</p>
							</div>

							{/* Summary - truncated to 2 lines */}
							{(node.data as any).summary && (
								<div>
									<div style={{
										fontSize: "11px",
										color: "rgba(148, 163, 184, 0.8)",
										textTransform: "uppercase",
										letterSpacing: "0.05em",
										marginBottom: "4px",
									}}>
										Summary
									</div>
									<p style={{
										fontSize: "14px",
										color: "rgba(203, 213, 225, 1)",
										margin: 0,
										lineHeight: "1.4",
										overflow: "hidden",
										display: "-webkit-box",
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical",
									}}>
										{(node.data as any).summary}
									</p>
								</div>
							)}

							{/* Type */}
							<div>
								<div style={{
									fontSize: "11px",
									color: "rgba(148, 163, 184, 0.8)",
									textTransform: "uppercase",
									letterSpacing: "0.05em",
									marginBottom: "4px",
								}}>
									Type
								</div>
								<p style={{
									fontSize: "14px",
									color: "rgba(203, 213, 225, 1)",
									margin: 0,
								}}>
									{(node.data as any).type || "Document"}
								</p>
							</div>

							{/* Memory Count */}
							<div>
								<div style={{
									fontSize: "11px",
									color: "rgba(148, 163, 184, 0.8)",
									textTransform: "uppercase",
									letterSpacing: "0.05em",
									marginBottom: "4px",
								}}>
									Memory Count
								</div>
								<p style={{
									fontSize: "14px",
									color: "rgba(203, 213, 225, 1)",
									margin: 0,
								}}>
									{(node.data as any).memoryEntries?.length || 0} memories
								</p>
							</div>

							{/* URL */}
							{((node.data as any).url || (node.data as any).customId) && (
								<div>
									<div style={{
										fontSize: "11px",
										color: "rgba(148, 163, 184, 0.8)",
										textTransform: "uppercase",
										letterSpacing: "0.05em",
										marginBottom: "4px",
									}}>
										URL
									</div>
									<a
										href={(() => {
											const doc = node.data as any
											if (doc.type === "google_doc" && doc.customId) {
												return `https://docs.google.com/document/d/${doc.customId}`
											}
											if (doc.type === "google_sheet" && doc.customId) {
												return `https://docs.google.com/spreadsheets/d/${doc.customId}`
											}
											if (doc.type === "google_slide" && doc.customId) {
												return `https://docs.google.com/presentation/d/${doc.customId}`
											}
											return doc.url ?? undefined
										})()}
										target="_blank"
										rel="noopener noreferrer"
										style={{
											fontSize: "14px",
											color: "rgb(129, 140, 248)",
											textDecoration: "none",
											display: "flex",
											alignItems: "center",
											gap: "4px",
											transition: "color 0.2s",
										}}
										onMouseEnter={(e) => e.currentTarget.style.color = "rgb(165, 180, 252)"}
										onMouseLeave={(e) => e.currentTarget.style.color = "rgb(129, 140, 248)"}
									>
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
											<polyline points="15 3 21 3 21 9"></polyline>
											<line x1="10" y1="14" x2="21" y2="3"></line>
										</svg>
										View Document
									</a>
								</div>
							)}

							{/* Footer with metadata */}
							<div style={{
								paddingTop: "12px",
								borderTop: "1px solid rgba(71, 85, 105, 0.5)",
								display: "flex",
								alignItems: "center",
								gap: "16px",
								fontSize: "12px",
								color: "rgba(148, 163, 184, 1)",
							}}>
								<div style={{
									display: "flex",
									alignItems: "center",
									gap: "4px",
								}}>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
										<line x1="16" y1="2" x2="16" y2="6"></line>
										<line x1="8" y1="2" x2="8" y2="6"></line>
										<line x1="3" y1="10" x2="21" y2="10"></line>
									</svg>
									<span>{new Date((node.data as any).createdAt).toLocaleDateString()}</span>
								</div>
								<div style={{
									display: "flex",
									alignItems: "center",
									gap: "4px",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									flex: 1,
								}}>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<line x1="4" y1="9" x2="20" y2="9"></line>
										<line x1="4" y1="15" x2="20" y2="15"></line>
										<line x1="10" y1="3" x2="8" y2="21"></line>
										<line x1="16" y1="3" x2="14" y2="21"></line>
									</svg>
									<span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{node.id}</span>
								</div>
							</div>
						</div>
					</div>
				) : (
					// Memory popover
					<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
						{/* Header */}
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgb(96, 165, 250)" }}>
									<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"></path>
									<path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"></path>
								</svg>
								<h3 style={{
									fontSize: "16px",
									fontWeight: "700",
									color: "white",
									margin: 0,
								}}>
									Memory
								</h3>
							</div>
							<button
								type="button"
								onClick={onClose}
								style={{
									padding: "4px",
									background: "transparent",
									border: "none",
									color: "rgba(148, 163, 184, 1)",
									cursor: "pointer",
									fontSize: "16px",
									lineHeight: "1",
									transition: "color 0.2s",
								}}
								onMouseEnter={(e) => e.currentTarget.style.color = "white"}
								onMouseLeave={(e) => e.currentTarget.style.color = "rgba(148, 163, 184, 1)"}
							>
								×
							</button>
						</div>

						{/* Sections */}
						<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
							{/* Memory content */}
							<div>
								<div style={{
									fontSize: "11px",
									color: "rgba(148, 163, 184, 0.8)",
									textTransform: "uppercase",
									letterSpacing: "0.05em",
									marginBottom: "4px",
								}}>
									Memory
								</div>
								<p style={{
									fontSize: "14px",
									color: "rgba(203, 213, 225, 1)",
									margin: 0,
									lineHeight: "1.4",
								}}>
									{(node.data as any).memory || (node.data as any).content || "No content"}
								</p>
								{(node.data as any).isForgotten && (
									<div style={{
										marginTop: "8px",
										padding: "4px 8px",
										background: "rgba(220, 38, 38, 0.15)",
										borderRadius: "4px",
										fontSize: "12px",
										color: "rgba(248, 113, 113, 1)",
										display: "inline-block"
									}}>
										Forgotten
									</div>
								)}
								{/* Expires (inline with memory if exists) */}
								{(node.data as any).forgetAfter && (
									<p style={{
										fontSize: "12px",
										color: "rgba(148, 163, 184, 1)",
										margin: "8px 0 0 0",
										lineHeight: "1.4",
									}}>
										Expires: {new Date((node.data as any).forgetAfter).toLocaleDateString()}
										{(node.data as any).forgetReason && ` - ${(node.data as any).forgetReason}`}
									</p>
								)}
							</div>

							{/* Space */}
							<div>
								<div style={{
									fontSize: "11px",
									color: "rgba(148, 163, 184, 0.8)",
									textTransform: "uppercase",
									letterSpacing: "0.05em",
									marginBottom: "4px",
								}}>
									Space
								</div>
								<p style={{
									fontSize: "14px",
									color: "rgba(203, 213, 225, 1)",
									margin: 0,
								}}>
									{(node.data as any).spaceId || "Default"}
								</p>
							</div>

							{/* Footer with metadata */}
							<div style={{
								paddingTop: "12px",
								borderTop: "1px solid rgba(71, 85, 105, 0.5)",
								display: "flex",
								alignItems: "center",
								gap: "16px",
								fontSize: "12px",
								color: "rgba(148, 163, 184, 1)",
							}}>
								<div style={{
									display: "flex",
									alignItems: "center",
									gap: "4px",
								}}>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
										<line x1="16" y1="2" x2="16" y2="6"></line>
										<line x1="8" y1="2" x2="8" y2="6"></line>
										<line x1="3" y1="10" x2="21" y2="10"></line>
									</svg>
									<span>{new Date((node.data as any).createdAt).toLocaleDateString()}</span>
								</div>
								<div style={{
									display: "flex",
									alignItems: "center",
									gap: "4px",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									flex: 1,
								}}>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<line x1="4" y1="9" x2="20" y2="9"></line>
										<line x1="4" y1="15" x2="20" y2="15"></line>
										<line x1="10" y1="3" x2="8" y2="21"></line>
										<line x1="16" y1="3" x2="14" y2="21"></line>
									</svg>
									<span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{node.id}</span>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	)
})
