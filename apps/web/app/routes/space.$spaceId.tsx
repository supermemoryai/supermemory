import { useEffect, useState } from "react"

import { type LoaderFunctionArgs, json } from "@remix-run/cloudflare"
import { useLoaderData, useNavigate } from "@remix-run/react"

import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session"
import {
    Clipboard,
    DeleteIcon,
    Pencil,
    Share,
    Star,
    Trash,
    UserPlus,
} from "lucide-react"
import { proxy } from "server/proxy"
import { toast } from "sonner"
import Navbar from "~/components/Navbar"
import MemoriesPage from "~/components/memories/MemoriesPage"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "~/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select"

interface Space {
    id: number
    uuid: string
    name: string
    ownerId: string
    isPublic: boolean
    createdAt: string
}

export async function loader({ params, request, context }: LoaderFunctionArgs) {
    const session = await getSessionFromRequest(request, context)

    const spaceId = params.spaceId?.split("---")[0]

    if (!spaceId) {
        throw new Response("Space not found", { status: 404 })
    }

    try {
        // Fetch space details and check access
        const response = await proxy(
            `/v1/spaces/${spaceId}`,
            { method: "GET" },
            request,
            context,
        )

        if (!response.ok) {
            if (response.status === 404) {
                throw new Response("Space not found", { status: 404 })
            }
            if (response.status === 403) {
                throw new Response("Access denied", { status: 403 })
            }
            throw new Response("Failed to load space", { status: 500 })
        }

        const space = (await response.json()) as Space & {
            permissions: {
                canRead: boolean
                canEdit: boolean
                isOwner: boolean
            }
        }

        return json({
            space,
            user: session?.user,
        })
    } catch (error) {
        console.error(
            "Error loading space:",
            error instanceof Error
                ? error.message
                : "Unknown error " + JSON.stringify(error),
        )
        throw new Response("Failed to load space", { status: 500 })
    }
}

export default function SpacePage() {
    const { space, user } = useLoaderData<typeof loader>()
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [accessType, setAccessType] = useState<"read" | "edit">("read")
    const [isInviting, setIsInviting] = useState(false)
    const [isFavorited, setIsFavorited] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editedName, setEditedName] = useState(space.name)
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        // Only update if we're on exactly /space/spaceid and not already in the correct format
        if (
            window.location.pathname === `/space/${space.uuid}` &&
            !window.location.pathname.includes("---")
        ) {
            // Convert space name to URL-friendly format
            const urlFriendlyName = space.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")

            const newPath = `/space/${space.uuid}---${urlFriendlyName}`
            // Use push instead of replace to maintain history
            navigate(newPath)
        }
    }, [space, navigate])

    const handleEditName = async () => {
        if (
            !editedName.trim() ||
            editedName.trim() === space.name ||
            isUpdating
        )
            return

        setIsUpdating(true)
        try {
            const response = await fetch(`/backend/v1/spaces/${space.uuid}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editedName.trim() }),
                credentials: "include",
            })

            if (!response.ok) {
                const data = (await response.json()) as { error: string }
                throw new Error(data.error || "Failed to update space name")
            }

            toast.success("Space name updated successfully")
            // Update URL with new name
            const urlFriendlyName = editedName
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
            navigate(`/space/${space.uuid}---${urlFriendlyName}`)
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to update space name",
            )
            setEditedName(space.name) // Reset to original name on error
        } finally {
            setIsUpdating(false)
            setIsEditing(false)
        }
    }

    const handleInvite = async () => {
        if (!email) return

        setIsInviting(true)
        try {
            const response = await fetch(
                `/backend/v1/spaces/${space.uuid}/invite`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, accessType }),
                    credentials: "include",
                },
            )

            if (!response.ok) {
                const data = (await response.json()) as { error: string }
                throw new Error(data.error || "Failed to send invite")
            }

            toast.success(`Invitation sent to ${email}`)
            setEmail("")
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to send invite",
            )
        } finally {
            setIsInviting(false)
        }
    }

    const handleFavorite = async () => {
        try {
            const response = await fetch(
                `/backend/v1/spaces/${space.uuid}/favorite`,
                {
                    method: isFavorited ? "DELETE" : "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                },
            )

            if (!response.ok) {
                const data = (await response.json()) as { error: string }
                toast.error(data.error || "Failed to update favorite status")
                throw new Error("Failed to update favorite status")
            }

            setIsFavorited(!isFavorited)
            toast.success(
                isFavorited ? "Removed from favorites" : "Added to favorites",
            )
        } catch (error) {
            toast.error("Failed to update favorite status")
        }
    }

    const handleShare = async () => {
        const shareUrl = window.location.href

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${space.name} - Supermemory Space`,
                    text: `Check out this space on Supermemory: ${space.name}`,
                    url: shareUrl,
                })
            } catch (err) {
                // Fallback to clipboard if share fails or is cancelled
                await navigator.clipboard.writeText(shareUrl)
            }
        } else {
            await navigator.clipboard.writeText(shareUrl)
        }
    }

    const handleCopyLink = async () => {
        const shareUrl = window.location.href
        await navigator.clipboard.writeText(shareUrl)
        toast.success("Link copied to clipboard!")
    }

    const handleDelete = async () => {
        const response = await fetch(`/backend/v1/spaces/${space.uuid}`, {
            method: "DELETE",
            credentials: "include",
        })

        if (!response.ok) {
            toast.error("Failed to delete space")
        } else {
            navigate("/")
            toast.success("Space deleted successfully")
        }
    }

    return (
        <div>
            <Navbar user={user} />
            <div className="p-4 font-geist md:p-24 md:pt-16">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:justify-between">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                                {isEditing && space.permissions.isOwner ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={editedName}
                                            onChange={(e) =>
                                                setEditedName(e.target.value)
                                            }
                                            className="text-3xl font-semibold h-auto py-1"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    handleEditName()
                                                } else if (e.key === "Escape") {
                                                    setIsEditing(false)
                                                    setEditedName(space.name)
                                                }
                                            }}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setIsEditing(false)
                                                setEditedName(space.name)
                                            }}
                                            className="text-muted-foreground"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={handleEditName}
                                            disabled={
                                                isUpdating ||
                                                !editedName.trim() ||
                                                editedName.trim() === space.name
                                            }
                                        >
                                            {isUpdating ? "Saving..." : "Save"}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <h1 className="font-geist text-3xl font-semibold dark:text-neutral-100 text-neutral-700 tracking-[-0.020em]">
                                            {space.name}
                                        </h1>
                                        {space.permissions.isOwner && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setIsEditing(true)
                                                }
                                                className="text-muted-foreground"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                                {space.permissions.canEdit && (
                                    <span className="px-2 py-0.5 text-sm bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-md">
                                        Can Edit
                                    </span>
                                )}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <div
                                        className={`w-2 h-2 rounded-full ${space.isPublic ? "bg-green-500" : "bg-yellow-500"}`}
                                    />
                                    <span>
                                        {space.isPublic
                                            ? "Public Space"
                                            : "Private Space"}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {space.permissions.isOwner && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <UserPlus className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80">
                                            <div className="grid gap-4">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium leading-none">
                                                        Invite to Space
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        Invite users to
                                                        collaborate in this
                                                        space
                                                    </p>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Input
                                                        type="email"
                                                        placeholder="Email address"
                                                        value={email}
                                                        onChange={(e) =>
                                                            setEmail(
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                    <Select
                                                        value={accessType}
                                                        onValueChange={(
                                                            value:
                                                                | "read"
                                                                | "edit",
                                                        ) =>
                                                            setAccessType(value)
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select permission" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {!space.isPublic && (
                                                                <SelectItem value="read">
                                                                    Can View
                                                                </SelectItem>
                                                            )}
                                                            <SelectItem value="edit">
                                                                Can Edit
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        onClick={handleInvite}
                                                        disabled={isInviting}
                                                    >
                                                        {isInviting
                                                            ? "Sending..."
                                                            : "Send Invite"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleShare}
                                >
                                    <Share className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopyLink}
                                >
                                    <Clipboard className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDelete}
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>

                                {space.isPublic &&
                                    user &&
                                    !space.permissions.isOwner &&
                                    !space.permissions.canEdit &&
                                    !space.permissions.canRead && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleFavorite}
                                            className={`ml-2 ${isFavorited ? "text-yellow-500" : "text-gray-500"}`}
                                        >
                                            <Star
                                                className="h-4 w-4"
                                                fill={
                                                    isFavorited
                                                        ? "currentColor"
                                                        : "none"
                                                }
                                            />
                                        </Button>
                                    )}
                            </div>
                        </div>
                    </div>

                    <div className="w-full">
                        <MemoriesPage
                            showAddButtons={space.permissions.canEdit}
                            isSpace={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

// Error boundary component
export function ErrorBoundary() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold">Oops!</h1>
                <p className="text-muted-foreground">
                    We couldn't load this space. It might not exist or you might
                    not have access to it.
                </p>
            </div>
        </div>
    )
}
