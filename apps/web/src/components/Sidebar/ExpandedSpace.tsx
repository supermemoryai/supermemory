import { useMemory } from "@/contexts/MemoryContext"
import { space, StoredContent } from '@/server/db/schema'

const tempSpace: typeof space.$inferSelect = {
  id: 1,
  name: "Cool tech",
  user: null
}

const spaceItems: StoredContent[] = [
  {
    id: 1,
    title: "How to build a website",
    content: "This is how you build a website",
    baseUrl: "https://www.google.com",
    url: "https://www.google.com",
    savedAt: new Date(),
    type: "page",
    description: null,
    image: '/icons/logo_without_bg.png',
  },
  {
    id: 2,
    title: "How to build a editor",
    content: "This is how you build a website",
    baseUrl: "https://www.google.com",
    url: "https://www.google.com",
    savedAt: new Date(),
    type: "page",
    description: null,
    image: '/icons/logo_without_bg.png',
  },
  {
    id: 3,
    title: "How to build a editor",
    content: "This is how you build a website",
    baseUrl: "",
    url: "",
    savedAt: new Date(),
    type: "note",
    description: null,
    image: '/icons/logo_without_bg.png',
  },

]

export function ExpandedSpace({spaceId}: {spaceId: number}) {

  const { spaces } = useMemory()

  return (
    <div className="text-rgray-11 flex w-full flex-col items-start py-8 text-left">

    </div>
  )
}