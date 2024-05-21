import React from 'react'
import LinkArrow from './linkArrow'

function Footer() {
  return (
    <footer className="mt-20 flex w-full items-center justify-between gap-4 px-8 py-8 text-sm text-zinc-500">
    <p>© 2024 Supermemory.ai</p>
    <div className="flex gap-5">
      <a className='flex group/mail' target='_blank' href="mailto:hi@dhravya.dev">Contact<LinkArrow classname='group-hover/mail:opacity-100 opacity-0 transition' stroke='#ffffff' /></a>
      <a className='flex group/twit' target='_blank' href="https://twitter.com/supermemoryai">Twitter <LinkArrow classname='group-hover/twit:opacity-100 opacity-0 transition' stroke='#ffffff' /></a>
      <a className='flex group/git' target='_blank' href="https://github.com/dhravya/supermemory">Github <LinkArrow stroke='#ffffff' classname='group-hover/git:opacity-100 opacity-0 transition' /></a>
    </div>
  </footer>
  )
}

export default Footer