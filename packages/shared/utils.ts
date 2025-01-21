import { customAlphabet } from "nanoid";

import {
  CoreMessage,
  CoreToolMessage,
  ToolInvocation,
  Message,
  FilePart,
  ImagePart,
  Attachment,
  DataContent,
} from "ai";

export const nanoid = customAlphabet(
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
);
export const randomId = () => nanoid(10);

function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<Message>;
}): Array<Message> {
  return messages.map((message) => {
    if (message.toolInvocations) {
      return {
        ...message,
        toolInvocations: message.toolInvocations.map((toolInvocation) => {
          const toolResult = toolMessage.content.find(
            (tool) => tool.toolCallId === toolInvocation.toolCallId
          );

          if (toolResult) {
            return {
              ...toolInvocation,
              state: "result",
              result: toolResult.result,
            };
          }

          return toolInvocation;
        }),
      };
    }

    return message;
  });
}

export const coreMessageAttachmentTypes = (
  message: CoreMessage
): Array<"file" | "image"> => {
  if (typeof message.content === "string") {
    return [];
  }

  const attachmentTypes = message.content
    .filter(
      (content): content is FilePart | ImagePart =>
        content.type === "file" || content.type === "image"
    )
    .map((content) => content.type);

  return attachmentTypes;
};

type GenericPart<T extends "file" | "image"> = T extends "file"
  ? FilePart
  : ImagePart;

export const getCoreMessageAttachments = (
  message: CoreMessage
): Array<Attachment> => {
  const attachmentTypes = coreMessageAttachmentTypes(message);
  if (attachmentTypes.length === 0) {
    return [];
  }

  if (typeof message.content === "string") {
    return [];
  }

  const attachments: Array<Attachment> = [];

  for (let i = 0; i < attachmentTypes.length; i++) {
    const attachmentType = attachmentTypes[i];
    const messageParts = message.content;

    const parts = messageParts.filter(
      (part) => part.type === attachmentType
    ) as Array<GenericPart<typeof attachmentType>>;

    let data: string | Uint8Array | ArrayBuffer | URL;

    if (attachmentType === "file") {
      data = (parts[0] as FilePart).data;
    } else {
      data = (parts[0] as ImagePart).image;
    }

    const normalisedData = typeof data === "string" ? data : data.toString();

    const size = normalisedData.length;
    attachments.push({
      name: size.toString(),
      url: normalisedData,
      contentType: parts[0].mimeType ?? "image/jpeg",
    });
  }
  return attachments;
};

export function convertToUIMessages(
  messages: Array<CoreMessage>
): Array<Message> {
  return messages.reduce((chatMessages: Array<Message>, message) => {
    if (message.role === "tool") {
      return addToolMessageToChat({
        toolMessage: message as CoreToolMessage,
        messages: chatMessages,
      }) satisfies Message[];
    }

    let textContent = "";
    let toolInvocations: Array<ToolInvocation> = [];

    if (typeof message.content === "string") {
      textContent = message.content.trim();
    } else if (Array.isArray(message.content)) {
      for (const content of message.content) {
        if (content.type === "text") {
          textContent += content.text.trim();
        } else if (content.type === "tool-call") {
          toolInvocations.push({
            state: "call",
            toolCallId: content.toolCallId,
            toolName: content.toolName,
            args: content.args,
          });
        }
      }
    }

    // Only add message if it has content or tool invocations
    if (textContent || toolInvocations.length > 0) {
      chatMessages.push({
        id: (message.content.length * 100).toString(),
        role: message.role,
        content: textContent.replace(/<context>([\s\S]*?)<\/context>/, ""),
        toolInvocations,
        experimental_attachments: getCoreMessageAttachments(message),
        annotations: textContent.includes("<context>")
          ? JSON.parse(
              textContent.match(/<context>([\s\S]*?)<\/context>/)?.[1] ?? ""
            )
          : undefined,
      });
    }

    return chatMessages;
  }, []);
}
