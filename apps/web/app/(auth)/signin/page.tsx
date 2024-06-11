import Image from "next/image";
import Link from "next/link";
import Logo from "@/public/logo.svg";
import { signIn } from "@/app/helpers/server/auth";
import { Google } from "@repo/ui/components/icons";

export const runtime = "edge";

async function Signin() {
  return (
    <div className="flex items-center justify-between min-h-screen">
      <div className="relative w-full lg:w-1/2 flex items-center justify-center lg:justify-start min-h-screen bg-secondary p-8">
        <div className="absolute top-0 left-0 p-8 text-white inline-flex gap-2 items-center">
          <Image
            src={Logo}
            alt="SuperMemory logo"
            className="brightness-100"
          />
          <span className="text-xl">SuperMemory.ai</span>
        </div>

        <div>
          <h1 className="text-5xl text-foreground mb-8">
            Hello, <span className="text-white">human</span>
          </h1>
          <p className="text-white mb-8 text-lg">
            Write, ideate, and learn with all the wisdom of your bookmarks.
          </p>
          <div className="flex items-center gap-4">
            <div
              className="w-3/4"
            >
              <form
                action={async () => {
                  "use server";
                  await signIn("google", {
                    redirectTo: "/home?firstTime=true",
                  });
                }}
              >
                <button
                  type="submit"
                  className={`text-white flex gap-3 justify-center bg-tranparent hover:border-transparent hover:bg-[#37485E] border-[#37485E] border-2 w-full py-3 items-center rounded-lg duration-100 hover:rounded-3xl`}
                >
                  <div className="-translate-y-[1px]">
                    <Google />
                  </div>
                  <span className="text-xl font-medium tracking-wide relative ">
                    Continue with Google
                  </span>
                </button>
              </form>
            </div>
          </div>
          <div className="text-slate-100 absolute bottom-4  lg:left-8 lg:-translate-x-0 left-1/2 -translate-x-1/2 ">
            <Link href="/terms" className="text-slate-300">
              Terms of Service
            </Link> |
            <Link href="/privacy" className="text-slate-300">
              {" "}
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
      <div className="w-1/2 hidden lg:flex flex-col items-center justify-center min-h-screen">
        <span className="text-3xl leading-relaxed italic mb-8">
          Ready for your{" "}
          <span className="text-white font-bold">Second brain</span>?
        </span>

        <div>
          <Image
            className="mx-auto rounded-lg shadow-2xl lg:max-w-none"
            src={"/images/carousel-illustration-01.png"}
            width={700}
            height={520}
            alt="Carousel 01"
          />
        </div>
      </div>
    </div>
  );
}

export default Signin;
