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
	ProcessInputStepArgs,
	ProcessInputStepResult,
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
