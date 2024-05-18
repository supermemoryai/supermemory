import { Box, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function SettingsTab({ open }: { open: boolean }) {
  const { data: session } = useSession();

  const [tweetStat, setTweetStat] = useState<[number, number] | null>();
  const [memoryStat, setMemoryStat] = useState<[number, number] | null>();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/getCount").then(async (resp) => {
      const data = (await resp.json()) as any;
      setTweetStat([data.tweetsCount, data.tweetsLimit]);
      setMemoryStat([data.pageCount, data.pageLimit]);
      setLoading(false);
    });
  }, [open]);

  return (
    <div className="flex h-full w-full flex-col items-start py-3 text-left font-normal text-black md:py-8">
      <div className="w-full px-6">
        <h1 className="w-full text-2xl font-medium">Settings</h1>
        <div className="mt-5 grid w-full grid-cols-3 gap-1">
          <img
            className="rounded-full"
            src={session?.user?.image ?? "/icons/white_without_bg.png"}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "/icons/white_without_bg.png";
            }}
          />
          <div className="col-span-2 flex flex-col items-start justify-center">
            <h1 className="text-xl font-medium">{session?.user?.name}</h1>
            <span>{session?.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="bg-rgray-4 hover:bg-rgray-5 focus-visible:bg-rgray-5 focus-visible:ring-rgray-7 relative mt-auto flex items-center justify-center gap-2 rounded-md px-4 py-2 text-white ring-transparent transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
      <div className="border-rgray-5 mt-auto w-full px-8 pt-8">
        <h1 className="flex w-full items-center gap-2 text-xl">
          <Box className="h-6 w-6" />
          Storage
        </h1>
        {loading ? (
          <div className="my-5 flex w-full flex-col items-center justify-center gap-5">
            <div className="bg-rgray-5 h-6 w-full animate-pulse rounded-md text-lg"></div>
            <div className="bg-rgray-5 h-6 w-full animate-pulse rounded-md text-lg"></div>
          </div>
        ) : (
          <>
            <div className="my-5">
              <h2 className="text-md flex w-full items-center justify-between">
                Memories
                <div className="bg-rgray-4 flex rounded-md px-2 py-2 text-xs text-white/70">
                  {memoryStat?.join("/")}
                </div>
              </h2>
              <div className="mt-2 h-5 w-full overflow-hidden rounded-full bg-stone-400">
                <div
                  style={{
                    width: `${((memoryStat?.[0] ?? 0) / (memoryStat?.[1] ?? 100)) * 100}%`,
                    minWidth: memoryStat?.[0] ?? 0 > 0 ? "5%" : "0%",
                  }}
                  className="bg-rgray-5 h-full rounded-full"
                />
              </div>
            </div>
            <div className="my-5">
              <h2 className="text-md flex w-full items-center justify-between">
                Tweets
                <div className="bg-rgray-4 flex rounded-md px-2 py-2 text-xs text-white/70">
                  {tweetStat?.join("/")}
                </div>
              </h2>
              <div className="mt-2 h-5 w-full overflow-hidden rounded-full bg-stone-400">
                <div
                  style={{
                    width: `${((tweetStat?.[0] ?? 0) / (tweetStat?.[1] ?? 100)) * 100}%`,
                    minWidth: tweetStat?.[0] ?? 0 > 0 ? "5%" : "0%",
                  }}
                  className="h-full rounded-full bg-white"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
