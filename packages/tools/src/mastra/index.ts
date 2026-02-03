export { withSupermemory } from "./wrapper"

export {
	SupermemoryInputProcessor,
	SupermemoryOutputProcessor,
	createSupermemoryProcessor,
	createSupermemoryOutputProcessor,
	createSupermemoryProcessors,
} from "./processor"

export type {
	SupermemoryMastraOptions,
	Processor,
	ProcessInputArgs,
	ProcessInputResult,
	ProcessOutputResultArgs,
	ProcessorMessageResult,
	MastraDBMessage,
	MastraMessageContentV2,
	MessageList,
	RequestContext,
	InputProcessor,
	OutputProcessor,
	PromptTemplate,
	MemoryMode,
	AddMemoryMode,
	MemoryPromptData,
} from "./types"
