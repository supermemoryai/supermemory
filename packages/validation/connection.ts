import { z } from "zod"
import { ConnectionProviderEnum } from "./schemas"

export const providers = ConnectionProviderEnum
export type Provider = z.infer<typeof providers>

const BaseMetadataSchema = <T extends z.ZodTypeAny>(provider: T) =>
	z.object({
		provider,
	})

export const NotionMetadataSchema = BaseMetadataSchema(
	z.literal("notion"),
).extend({
	email: z.string().email().optional(),
	ownerId: z.string(),
	workspaceIcon: z.string().optional(),
	workspaceId: z.string(),
	workspaceName: z.string(),
})
export type NotionMetadata = z.infer<typeof NotionMetadataSchema>

export const GoogleDriveMetadataSchema = BaseMetadataSchema(
	z.literal("google-drive"),
).extend({
	pageToken: z.number(),
	webhookChannelId: z.string().optional(),
	webhookExpiration: z.number().optional(),
	webhookResourceId: z.string().optional(),
})
export type GoogleDriveMetadata = z.infer<typeof GoogleDriveMetadataSchema>

export const OneDriveMetadataSchema = BaseMetadataSchema(
	z.literal("onedrive"),
).extend({
	deltaLink: z.string().optional(),
	lastRenewalCheck: z.number().optional(),
	webhookClientState: z.string().optional(),
	webhookExpiration: z.number().optional(),
	webhookSubscriptionId: z.string().optional(),
})
export type OneDriveMetadata = z.infer<typeof OneDriveMetadataSchema>

export const ConnectionMetadataSchema = z.discriminatedUnion("provider", [
	NotionMetadataSchema,
	GoogleDriveMetadataSchema,
	OneDriveMetadataSchema,
])
export type ConnectionMetadata<T extends Provider> = T extends "notion"
	? NotionMetadata
	: T extends "google-drive"
		? GoogleDriveMetadata
		: T extends "onedrive"
			? OneDriveMetadata
			: never

export function isNotionMetadata(
	metadata: unknown,
): metadata is NotionMetadata {
	return NotionMetadataSchema.safeParse(metadata).success
}

export function isGoogleDriveMetadata(
	metadata: unknown,
): metadata is GoogleDriveMetadata {
	return GoogleDriveMetadataSchema.safeParse(metadata).success
}

export function isOneDriveMetadata(
	metadata: unknown,
): metadata is OneDriveMetadata {
	return OneDriveMetadataSchema.safeParse(metadata).success
}

export const ConnectionStateSchema = z.object({
	createdAt: z.number(),
	org: z.string(),
	provider: providers,
	userId: z.string(),
})
export type ConnectionState = z.infer<typeof ConnectionStateSchema>

export const TokenDataSchema = z.object({
	// Only used for Notion connections since they don't support refresh tokens
	accessToken: z.string().optional(),
	createdAt: z.number(),
	documentLimit: z.number().optional(),
	email: z.string().email().optional(),
	expiresAt: z.number().optional(),
	metadata: ConnectionMetadataSchema.optional(),
	refreshToken: z.string().optional(),
	userId: z.string().optional(),
})
export type TokenData = z.infer<typeof TokenDataSchema>

export const NotionTokenResponseSchema = z.object({
	access_token: z.string(),
	bot_id: z.string().optional(),
	duplicated_template_id: z.string().nullable().optional(),
	owner: z.union([
		z.object({
			type: z.literal("user"),
			user: z.object({
				avatar_url: z.string().url().optional(),
				id: z.string(),
				name: z.string().optional(),
				object: z.literal("user"),
				person: z
					.object({
						email: z.string().email().optional(),
					})
					.optional(),
				type: z.literal("person"),
			}),
		}),
		z.object({
			type: z.literal("workspace"),
			workspace: z.literal(true),
		}),
	]),
	request_id: z.string().optional(),
	token_type: z.literal("bearer"),
	workspace_icon: z.string().optional(),
	workspace_id: z.string(),
	workspace_name: z.string(),
})
export type NotionTokenResponse = z.infer<typeof NotionTokenResponseSchema>

export const GoogleDriveTokenResponseSchema = z.object({
	access_token: z.string(),
	expires_in: z.number(),
	refresh_token: z.string().optional(),
	scope: z.string(),
	token_type: z.literal("Bearer"),
})
export type GoogleDriveTokenResponse = z.infer<
	typeof GoogleDriveTokenResponseSchema
>

export const OneDriveTokenResponseSchema = z.object({
	access_token: z.string(),
	expires_in: z.number(),
	refresh_token: z.string().optional(),
	scope: z.string(),
	token_type: z.literal("Bearer"),
})
export type OneDriveTokenResponse = z.infer<typeof OneDriveTokenResponseSchema>

export const NotionConfigSchema = z.object({
	clientId: z.string(),
	clientSecret: z.string(),
	endpoints: z.object({
		authorize: z.string().url(),
		token: z.string().url(),
	}),
	scopes: z.array(z.string()),
})
export type NotionConfig = z.infer<typeof NotionConfigSchema>

export const ConnectionQuerySchema = z.object({
	id: z.string(),
	redirectUrl: z.string().optional(),
})

export const GoogleDrivePageTokenResponseSchema = z.object({
	startPageToken: z.union([z.string(), z.number()]),
})

export const GoogleDriveWatchResponseSchema = z.object({
	expiration: z.string(),
	id: z.string(),
	resourceId: z.string(),
})

export const OneDriveSubscriptionResponseSchema = z.object({
	changeType: z.string(),
	clientState: z.string(),
	expirationDateTime: z.string(),
	id: z.string(),
	notificationUrl: z.string(),
	resource: z.string(),
})

export const GoogleUserInfoResponseSchema = z.object({
	email: z.string().email(),
})

export const MicrosoftUserInfoResponseSchema = z.object({
	mail: z.string().optional(),
	userPrincipalName: z.string().optional(),
})
