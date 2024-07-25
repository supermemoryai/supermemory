import TailwindAdvancedEditor from "@/components/editor/advanced-editor";
import "./prosemirror.css";
export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#171B1F]">
      <TailwindAdvancedEditor />
    </div>
  );
}