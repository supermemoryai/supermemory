import Markdown from "react-markdown";

import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";

import {
	authkitLoader,
	getSessionFromRequest,
} from "@supermemory/authkit-remix-cloudflare/src/session";
import { Document } from "@supermemory/db/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MenuIcon, TrashIcon } from "lucide-react";
import { proxy } from "server/proxy";
import { toast } from "sonner";
import Navbar from "~/components/Navbar";
import SharedCard from "~/components/memories/SharedCard";
import { SpaceSelector } from "~/components/memories/SharedCard";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export const loader = (args: LoaderFunctionArgs) =>
	authkitLoader(args, async ({ request, context }) => {
		const contentId = args.params.contentid;

		const session = await getSessionFromRequest(request, context);

		if (!session?.user.id || !contentId) {
			throw new Response(null, {
				status: 404,
				statusText: "Not found",
			});
		}

		const content = await proxy(`/api/memories/${contentId}`, {}, request, context);

		if (!content) {
			throw new Response(null, {
				status: 404,
				statusText: "Not found",
			});
		}

		if (content.status == 401) {
			throw new Response(null, {
				status: 401,
				statusText: "Unauthorized",
			});
		}

		const jsoncon = (await content.json()) as Document;

		return { content: jsoncon, user: session.user };
	});

export default function Content() {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return <div>Not found</div>;
	}

	const { content, user } = useLoaderData<typeof loader>();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	// Delete mutation
	const deleteMutation = useMutation({
		mutationFn: async (id: number) => {
			const response = await fetch(`/backend/api/memories/${id}`, {
				method: "DELETE",
				credentials: "include",
			});
			if (!response.ok) {
				throw new Error("Failed to delete memory");
			}
			return response.json();
		},
		onSuccess: () => {
			toast.success("Memory deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["memories"] });
			navigate("/"); // Redirect to home after deletion
		},
		onError: () => {
			toast.error("Failed to delete memory");
		},
	});

	// Move to space mutation
	const moveToSpaceMutation = useMutation({
		mutationFn: async ({ spaceId, documentId }: { spaceId: string; documentId: string }) => {
			const response = await fetch("/backend/api/spaces/addContent", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({ spaceId, documentId }),
			});
			if (!response.ok) {
				throw new Error("Failed to move memory");
			}
			return response.json();
		},
		onSuccess: () => {
			toast.success("Memory moved successfully");
			queryClient.invalidateQueries({ queryKey: ["memories"] });
			queryClient.invalidateQueries({ queryKey: ["spaces"] });
		},
		onError: () => {
			toast.error("Failed to move memory to space");
		},
	});

	const handleDelete = () => {
		deleteMutation.mutate(content.id);
	};

	const handleMoveToSpace = (spaceId: string) => {
		moveToSpaceMutation.mutate({
			spaceId,
			documentId: content.uuid,
		});
	};

	if (content.type === "tweet") {
		return (
			<div>
				<Navbar user={user} />
				<div className="max-w-2xl mx-auto p-6">
					<div className="flex justify-between items-center mb-6">
						<h1 className="text-2xl font-bold">Tweet</h1>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon">
									<MenuIcon className="h-5 w-5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuSub>
									<DropdownMenuSubTrigger>Move to ...</DropdownMenuSubTrigger>
									<DropdownMenuPortal>
										<SpaceSelector contentId={content.id} onSelect={handleMoveToSpace} />
									</DropdownMenuPortal>
								</DropdownMenuSub>
								<DropdownMenuItem onSelect={handleDelete}>
									<Button className="w-full gap-2 flex" variant="destructive">
										<TrashIcon className="h-4 w-4" /> Delete
									</Button>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<SharedCard data={content as any} />
					{content.raw && (
						<div className="mt-8 p-4 bg-muted rounded-lg">
							<h2 className="text-lg font-semibold mb-4">Tweet Text</h2>
							<p className="">{content.raw.split("Metadata for this tweet:")[0]}</p>
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div>
			<Navbar user={user} />
			<div className="max-w-4xl mx-auto p-6">
				<header className="mb-8 border-b pb-8">
					<div className="flex justify-between items-start">
						<div>
							{content.title && (
								<h1 className="text-4xl font-bold mb-4 text-foreground">{content.title}</h1>
							)}

							<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
								{content.type && (
									<div className="capitalize px-3 py-1 rounded-full bg-primary/10 text-primary">
										{content.type}
									</div>
								)}
								{content.createdAt && (
									<time className="flex items-center gap-2">
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
										{new Date(content.createdAt).toLocaleDateString("en-US", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</time>
								)}
								{content.url && (
									<a
										href={content.url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 hover:text-primary transition-colors"
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
											/>
										</svg>
										View Source
									</a>
								)}
							</div>
						</div>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon">
									<MenuIcon className="h-5 w-5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuSub>
									<DropdownMenuSubTrigger>Move to ...</DropdownMenuSubTrigger>
									<DropdownMenuPortal>
										<SpaceSelector contentId={content.id} onSelect={handleMoveToSpace} />
									</DropdownMenuPortal>
								</DropdownMenuSub>
								<DropdownMenuItem onSelect={handleDelete}>
									<Button className="w-full gap-2 flex" variant="destructive">
										<TrashIcon className="h-4 w-4" /> Delete
									</Button>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</header>

				{content.ogImage && (
					<div className="mb-8">
						<img
							src={content.ogImage}
							alt={content.title || "Content preview"}
							className="w-full h-64 object-cover rounded-lg shadow-lg"
						/>
					</div>
				)}

				{content.description && (
					<div className="mb-8 bg-muted/50 p-4 rounded-lg border">
						<p className="text-muted-foreground italic">{content.description}</p>
					</div>
				)}

				<article className="prose dark:prose-invert max-w-none">
					<Markdown className="leading-relaxed">
						{content.raw || content.content || "No content available"}
					</Markdown>
				</article>
			</div>
		</div>
	);
}
