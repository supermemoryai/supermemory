import {
  Github,
  Medium,
  Notion,
  Reddit,
  Twitter,
} from "@repo/ui/components/icons";
import Image from "next/image";
const logos = [
  {
    name: "Larvel",
    url: <Github className="w-16 h-16 brightness-100 invert-1 mx-10" />,
  },
  {
    name: "Nextjs",
    url: <Medium className="w-16 h-16 brightness-100 invert-1 mx-10" />,
  },
  {
    name: "Prime",
    url: <Notion className="w-16 h-16 brightness-100 invert-1 mx-10" />,
  },
  {
    name: "Trustpilot",
    url: <Reddit className="w-16 h-16 brightness-100 invert-1 mx-10" />,
  },
  {
    name: "Webflow",
    url: <Twitter className="w-16 h-16 brightness-100 invert-1 mx-10" />,
  },
];

const AnimatedLogoCloud = () => {
  return (
    <div className="py-2 max-w-4xl">
      <p className="font-normal tracking-tighter text-base text-gray-100 bg-gradient-to-br from-zinc-400 via-zinc-300 to-zinc-700 bg-clip-text text-transparent text-center mt-6">
        Well Integrated with six companies so far

      
      </p>
      {/* <hr className="h-[0.1px]  relative bg-white/10" /> */}

      <div className="relative bg-page-gradient h-full mx-auto max-w-full">
      <div className="absolute z-40  mx-auto  h-screen  overflow-hidden bg-inherit bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
        
      </div>
      <div className="px-4 mx-auto w-full md:px-8 relative ">

        <div
          className="flex overflow-hidden relative gap-6 p-2 mt-6 group"
          style={{
            maskImage:
              "linear-gradient(to left, transparent 0%, black 20%, black 80%, transparent 95%)",
          }}
        >
          {Array(5)
            .fill(null)
            .map((index) => (
              <div
                key={index}
                className="flex flex-row gap-10 justify-around animate-logo-cloud shrink-0"
              >
                {logos.map((logo, key) => (
                  <>{logo.url}</>
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AnimatedLogoCloud;
