import React from 'react'
import reactLogo from '../public/react.png'
import tailwindBg from '../public/tailwind_bg.png'
import typescriptLogo from '../public/typescript.png'
import tailwindLogo from '../public/tailwind.png'
import chromeWindowBg from '../public/chromeWindow.png'

export default function ContentApp() {
  const [isdialogOpen, setIsDialogOpen] = React.useState(true)

  if (!isdialogOpen) {
    return (
      <div className="mx-auto p-6">
        <button
          onClick={() => setIsDialogOpen(true)}
          className="bg-white rounded-md p-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          🧩 Open content script hint <span aria-hidden="true">+</span>
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl md:px-0 lg:p-6">
      <div className="relative isolate overflow-hidden bg-gray-900 px-6 pt-16 shadow-2xl lg:rounded-3xl md:pt-24 md:h-full sm:h-[100vh] lg:flex lg:gap-x-20 lg:px-24 lg:pt-0">
        <div className="absolute z-20 top-0 inset-x-0 flex justify-center overflow-hidden pointer-events-none">
          <div className="w-[108rem] flex-none flex justify-end">
            <picture>
              <img
                src={tailwindBg}
                alt=""
                className="w-[90rem] flex-none max-w-none hidden dark:block"
                decoding="async"
              />
            </picture>
          </div>
        </div>
        <div className="mx-auto max-w-md text-center lg:py-12 lg:mx-0 lg:flex-auto lg:text-left">
          <div className="flex items-center justify-center space-x-4 my-4 mx-auto">
            <img
              alt="React logo"
              src={reactLogo}
              className="relative inline-block w-12"
            />
            <div className="text-3xl text-white">+</div>
            <img
              alt="TypeScript logo"
              src={typescriptLogo}
              className="relative inline-block w-12"
            />
            <div className="text-3xl text-white">+</div>
            <img
              alt="Tailwind logo"
              src={tailwindLogo}
              className="relative inline-block w-12"
            />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            This is a content script running React, TypeScript, and
            Tailwind.css.
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Learn more about creating cross-browser extensions by{' '}
            <button
              onClick={() => setIsDialogOpen(false)}
              className="underline hover:no-underline
            "
            >
              closing this hint
            </button>
            .
          </p>
        </div>
        <div className="relative mt-16 h-80 lg:mt-8">
          <img
            className="absolute left-0 top-0 w-[57rem] max-w-none rounded-md bg-white/5 ring-1 ring-white/10"
            src={chromeWindowBg}
            alt="Chrome window screenshot"
            width="1824"
            height="1080"
          />
        </div>
      </div>
    </div>
  )
}
