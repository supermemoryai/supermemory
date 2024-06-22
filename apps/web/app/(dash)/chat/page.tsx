import ChatWindow from "./chatWindow";
import { chatSearchParamsCache } from "@/lib/searchParams";
import {
  ChevronDownIcon,
  ClipboardIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { ArrowRightIcon } from "@repo/ui/icons";
import QueryInput from "@repo/ui/components/QueryInput";
// @ts-expect-error
await import("katex/dist/katex.min.css");

function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { firstTime, q, spaces } = chatSearchParamsCache.parse(searchParams);

  console.log(spaces);

  return <ChatWindow q={q} spaces={spaces} threadId={""} />;
  return (
    <div className="max-w-3xl z-10 mx-auto relative h-full overflow-y-auto no-scrollbar">
      {/* <ChatWindow q={q} spaces={[]} /> */}

      <div className="w-full pt-24 space-y-40">
        {/* single q&A */}
        {Array.from({ length: 1 }).map((_, i) => (
          <div key={i} className="space-y-16">
            {/* header */}
            <div>
              {/* query */}
              <h1 className="text-white text-xl">
                Why is Retrieval-Augmented Generation important?
              </h1>
            </div>

            {/* response */}
            <div className="space-y-10">
              {/* related memories */}
              <div className="space-y-4">
                {/* section header */}
                <div className="flex items-center gap-3">
                  <h1>Related memories</h1>
                  <button>
                    <ChevronDownIcon className="size-4 stroke-2" />
                  </button>
                </div>

                {/* section content */}
                {/* collection of memories */}
                <div className="flex items-center no-scrollbar overflow-auto gap-4">
                  {/* related memory */}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[350px] shrink-0 p-4 gap-2 rounded-2xl flex flex-col bg-secondary"
                    >
                      <h3 className="text-[13px]">Webpage</h3>
                      <p className="line-clamp-2 text-white">
                        What is RAG? - Retrieval-Augmented Generation Explained
                        - AWS
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* summary */}
              <div className="space-y-4">
                {/* section header */}
                <div className="flex items-center gap-3">
                  <h1>Summary</h1>
                  <button>
                    <ChevronDownIcon className="size-4 stroke-2" />
                  </button>
                </div>

                {/* section content */}
                <div>
                  <p className="text-white text-base">
                    Retrieval-Augmented Generation is crucial because it
                    combines the strengths of retrieval-based methods, ensuring
                    relevance and accuracy, with generation-based models,
                    enabling creativity and flexibility. By integrating
                    retrieval mechanisms, it addresses data sparsity issues,
                    improves content relevance, offers fine-tuned control over
                    output, handles ambiguity, and allows for continual
                    learning, making it highly adaptable and effective across
                    various natural language processing tasks and domains.
                  </p>

                  {/* response actions */}
                  <div className="mt-3 relative -left-2 flex items-center gap-1">
                    {/* speak response */}
                    <button className="group h-8 w-8 flex justify-center items-center active:scale-75 duration-200">
                      <SpeakerWaveIcon className="size-[18px] group-hover:text-primary" />
                    </button>
                    {/* copy response */}
                    <button className="group h-8 w-8 flex justify-center items-center active:scale-75 duration-200">
                      <ClipboardIcon className="size-[18px] group-hover:text-primary" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-4 max-w-3xl w-full">
        <QueryInput />
      </div>
    </div>
  );
}

export default Page;
