import { cn } from "@repo/ui/lib/utils";

function Divider({ className }: { className?: string }) {
  return <div className={cn("bg-[#2D343A] h-[1px] w-full", className)}></div>;
}

export default Divider;
