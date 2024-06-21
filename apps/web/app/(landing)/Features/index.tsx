import { CheckIcon, ChevronRight } from "lucide-react";
import {
  PhotoChatMessage,
  Gradient,
  VideoBar,
  VideoChatMessage,
} from "./features";

import Generating from "./generating";
import Service01 from "../../../public/images/service-1.png";

const Services = () => {
  return (
    <div id="how-to-use">
      <div className="container">
        <div className="max-w-5xl mr-auto">
          <h1 className="mr-auto text-left font-geistSans tracking-tighter text-4xl md:text-5xl lg:text-6xl text-transparent bg-clip-text bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
            Supermemory is made for all.
          </h1>
          <p className="text-left ml-auto font-nomral tracking-tight text-lg mb-10">
            Brainwave unlocks the potential of AI-powered
          </p>
        </div>

        <div className="relative bg-page-gradient">
          <div className="flex  overflow-hidden relative items-center p-8 mb-5 rounded-3xl border lg:p-20 z-1 h-[39rem] border-white/20 xl:h-[46rem]">
            <img
              src="https://tailwindcss.com/_next/static/media/docs@30.8b9a76a2.avif"
              className="absolute top-0 right-0 z-2 opacity-100"
            />
            <img
              src="https://tailwindcss.com/_next/static/media/docs@30.8b9a76a2.avif"
              className="absolute top-0 right-0 z-2 opacity-100"
            />
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none md:w-3/5 xl:w-auto">
              <img
                className="object-cover w-full h-full md:object-right"
                width={800}
                alt="Smartest AI"
                height={730}
                src={"/images/service-1.png"}
              />
            </div>

            <div className="relative ml-auto z-1 max-w-[17rem]">
              <h4 className="mb-4 text-3xl md:text-4xl ">SuperMemoery.</h4>
              <p className="body-2 mb-[3rem] text-n-3">
                Supermemory unlocks the potential of AI-powered applications
              </p>
              <ul className="text-lg">
                {brainwaveServices.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start py-4 border-t border-white/20"
                  >
                    <CheckIcon className="w-4 h-4 mt-2 inline-flex justify-center items-center text-slate-200 size-4  rounded-full ml-2" />
                    {/* <img width={24} height={24} src={check} /> */}
                    <p className="ml-4">{item}</p>
                  </li>
                ))}
              </ul>
            </div>

            <Generating className="absolute right-4 bottom-4 left-4 border lg:bottom-8 lg-right-auto lg:left-1/2 lg:-translate-x-1/2 border-n-1/10" />
          </div>

          <div className="grid relative gap-5 lg:grid-cols-2 z-1 ">
            <div className="overflow-hidden relative rounded-3xl border min-h-[30rem] bg-hero-gradient bg-slate-950/10  border-white/10">
              <div className="absolute inset-0">
                <div className="absolute -z-1 inset-0  h-[600px] w-full bg-transparent opacity-5 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>

                <img
                  src="https://jsm-brainwave.com/assets/image-4-Cbi5cq1J.png"
                  className="object-contain w-full h-full"
                  width={630}
                  height={750}
                  alt="robot"
                />
              </div>

              <div className="flex absolute inset-0 flex-col items-start justify-end -mt-20 p-8 bg-glass-gradient">
                <h4 className="text-3xl tracking-tight mb-2 text-center text-transparent bg-clip-text bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
                  Self Hostable
                </h4>
                <p className="font-normal tracking-tighter mb-[3rem] text-lg max-w-lg text-gray-400 ">
                  Automatically enhance your photos using our AI app&apos;s
                  photo editing feature. Try it now!
                </p>
                <a
                  href="/components"
                  className="mt-[-20px] inline-flex bg-glass-gradient rounded-xl text-center group items-center w-full justify-center bg-gradient-to-tr from-zinc-300/5 via-gray-400/5 to-transparent bg-transparent  border-white/10 border-[1px] hover:bg-transparent/10 transition-colors sm:w-auto py-4 px-10"
                >
                  Get started
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 duration-300" />
                </a>
              </div>

              {/* <PhotoChatMessage //> */}
            </div>

            <div
             style={{
              background:
                "linear-gradient(143.6deg, rgba(192, 132, 252, 0) 20.79%, rgba(140, 121, 249, 0.40) 40.92%, rgba(140, 121, 249, 0) 80.35%)",
            }}
            
            className="overflow-hidden group relative py-4 rounded-3xl bg-glass-gradient lg:min-h-[30rem]">
              <div className="py-12 px-4 xl:px-8 relative">
                <h4 className="text-3xl tracking-tight mb-2 text-left text-transparent bg-clip-text bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
                  Privacy First
                </h4>
                <p className="body-2 mb-[2rem] text-gray-400 text-lg">
                  The world’s most powerful AI photo and video art generation
                  engine. What will you create?
                </p>
              </div>

              <div className="overflow-hidden relative rounded-xl h-[20rem] md:h-[25rem]">
                <img
                  src={
                    // "/images/privacy.png"
                    "https://www.limitless.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fvault.a0431de1.webp&w=1920&q=75"
                    // "https://www.authkit.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fbackground.896d177e.png&w=1920&q=75"
                    // "https://www.authkit.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fbackground.b48df3d6.png&w=828&q=75"
                  }
                  className="object-cover w-full h-full group-hover:rotate-3 transform duration-500  transition-all  ease-linear"
                  width={520}
                  height={400}
                  alt="Scary robot"
                />

                {/* <VideoBar /> */}
              </div>
              <img
                src="https://tailwindcss.com/_next/static/media/docs@30.8b9a76a2.avif"
                className="absolute h-[400px] inset-x-0 bottom-0 z-2 opacity-50 rotate-180"
              />
              <div
               className="absolute bottom-0 h-full"
                style={{
                  background:
                    "linear-gradient(143.6deg, rgba(192, 132, 252, 0) 20.79%, rgba(232, 121, 249, 0.26) 40.92%, rgba(204, 171, 238, 0) 70.35%)",
                }}
              ></div>

              {/* <Gradient opacity={20} /> */}
            </div>
          </div>

          <div 
           style={{
            background:
              "linear-gradient(143.6deg, rgba(192, 132, 252, 0) 20.79%, rgba(140, 121, 249, 0.2) 40.92%, rgba(140, 121, 249, 0) 80.35%)",
          }}
          
          className="flex bg-page-gradient  mt-10 overflow-hidden relative items-center p-8 mb-5 rounded-3xl border lg:p-20 z-1 h-[30rem] border-white/20 xl:h-[28rem]">
            <img
              src="https://tailwindcss.com/_next/static/media/docs@30.8b9a76a2.avif"
              className="absolute top-0 right-0 z-2 opacity-100"
            />
            {/* <img
              src="https://tailwindcss.com/_next/static/media/docs@30.8b9a76a2.avif"
              className="absolute top-0 right-0 z-2 opacity-100"
            /> */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none md:w-3/5 xl:w-auto">
              <img
                className="object-cover w-full h-full md:object-right lg:mt-20 scale-150  border-r-2 border-r-white/5"
                width={800}
                alt="Github"
                height={730}
                src={"/images/github.webp"}
              />
              {/* <div className="absolute rop-0 left-0 bg-black/20"></div> */}
            </div>
            {/* <Gradient /> */}

            <div className="relative ml-auto z-1">
              <h4 className="mb-4 md:text-3xl lg:text-5xl ">
                Proudly <br /> OpenSource
              </h4>
              <p className="body-2 mb-[3rem] text-n-3">
                Supermemory unlocks the potential of AI-powered applications
              </p>
              <a
                href="/components"
                className="mt-[-20px] inline-flex bg-glass-gradient rounded-xl text-center group items-center w-full justify-center bg-gradient-to-tr from-zinc-300/5 via-gray-400/5 to-transparent bg-transparent  border-white/10 border-[1px] hover:bg-transparent/10 transition-colors sm:w-auto py-4 px-10"
              >
                Get The Github
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 duration-300" />
              </a>
            </div>
          </div>

          <Gradient />
        </div>
      </div>
    </div>
  );
};

export default Services;
const brainwaveServices = ["AI first", "Self host", "Privacy first"];

const brainwaveServicesIcons = [
  "https://github.com/adrianhajdin/brainwave/blob/main/src/assets/recording-03.svg",
  "https://github.com/adrianhajdin/brainwave/blob/main/src/assets/recording-03.svg",
  "https://github.com/adrianhajdin/brainwave/blob/main/src/assets/disc-02.svg",
  "https://github.com/adrianhajdin/brainwave/blob/main/src/assets/chrome-cast.svg",
  "https://github.com/adrianhajdin/brainwave/blob/main/src/assets/sliders-04.svg",
];
