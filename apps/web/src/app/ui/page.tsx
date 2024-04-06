import { MemoryProvider } from "@/contexts/MemoryContext";
import Content from "./content";

export default function Home() {
  return (
    <MemoryProvider spaces={[]}>
      <Content />
    </MemoryProvider>
  );
}
