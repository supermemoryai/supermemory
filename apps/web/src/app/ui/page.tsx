import Main from "@/components/Main";
import Sidebar from "@/components/Sidebar/index";

export default async function Home() {
  return (
    <div className="flex w-screen">
      <Sidebar />
      <Main />
    </div>
  );
}
