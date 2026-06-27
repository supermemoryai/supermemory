"use client"

/**
 * OrbitMemory — Supermemory "Connect Your Tools" onboarding visual (desktop, left column).
 * Zero-dependency. A curated constellation of what Supermemory connects to — AI models & agents
 * (Claude, ChatGPT/Codex, Gemini, Copilot, Perplexity), the MCP protocol, and apps/tools — orbits
 * a central Supermemory mark on layered dotted tracks (continuous, gentle per-ring parallax).
 * A single requestAnimationFrame loop periodically connects to ONE node: a STATIC dashed neutral-
 * gray track fades in and staggered blue comet streaks glide along it while the node glows cobalt,
 * then it disconnects and moves to the next. Honors prefers-reduced-motion.
 */
import type React from "react"
import { useEffect, useRef } from "react"

const ICONS: Record<string, string> = {
	googlegemini:
		'<svg viewBox="0 0 296 298" xmlns="http://www.w3.org/2000/svg" fill="none"><mask id="googlegemini_a" width="296" height="298" x="0" y="0" maskUnits="userSpaceOnUse" style="mask-type:alpha"><path fill="#3186FF" d="M141.201 4.886c2.282-6.17 11.042-6.071 13.184.148l5.985 17.37a184.004 184.004 0 0 0 111.257 113.049l19.304 6.997c6.143 2.227 6.156 10.91.02 13.155l-19.35 7.082a184.001 184.001 0 0 0-109.495 109.385l-7.573 20.629c-2.241 6.105-10.869 6.121-13.133.025l-7.908-21.296a184 184 0 0 0-109.02-108.658l-19.698-7.239c-6.102-2.243-6.118-10.867-.025-13.132l20.083-7.467A183.998 183.998 0 0 0 133.291 26.28l7.91-21.394Z"/></mask><g mask="url(#googlegemini_a)"><g filter="url(#googlegemini_b)"><ellipse cx="163" cy="149" fill="#3689FF" rx="196" ry="159"/></g><g filter="url(#googlegemini_c)"><ellipse cx="33.5" cy="142.5" fill="#F6C013" rx="68.5" ry="72.5"/></g><g filter="url(#googlegemini_d)"><ellipse cx="19.5" cy="148.5" fill="#F6C013" rx="68.5" ry="72.5"/></g><g filter="url(#googlegemini_e)"><path fill="#FA4340" d="M194 10.5C172 82.5 65.5 134.333 22.5 135L144-66l50 76.5Z"/></g><g filter="url(#googlegemini_f)"><path fill="#FA4340" d="M190.5-12.5C168.5 59.5 62 111.333 19 112L140.5-89l50 76.5Z"/></g><g filter="url(#googlegemini_g)"><path fill="#14BB69" d="M194.5 279.5C172.5 207.5 66 155.667 23 155l121.5 201 50-76.5Z"/></g><g filter="url(#googlegemini_h)"><path fill="#14BB69" d="M196.5 320.5C174.5 248.5 68 196.667 25 196l121.5 201 50-76.5Z"/></g></g><defs><filter id="googlegemini_b" width="464" height="390" x="-69" y="-46" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="18"/></filter><filter id="googlegemini_c" width="265" height="273" x="-99" y="6" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="googlegemini_d" width="265" height="273" x="-113" y="12" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="googlegemini_e" width="299.5" height="329" x="-41.5" y="-130" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="googlegemini_f" width="299.5" height="329" x="-45" y="-153" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="googlegemini_g" width="299.5" height="329" x="-41" y="91" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="googlegemini_h" width="299.5" height="329" x="-39" y="132" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter></defs></svg>',
	openai:
		'<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 260"><path fill="#fff" d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"/></svg>',
	raycast:
		'<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path fill-rule="evenodd" clip-rule="evenodd" d="M7 18.079V21L0 14L1.46 12.54L7 18.081V18.079ZM9.921 21H7L14 28L15.46 26.54L9.921 21ZM26.535 15.462L27.996 14L13.996 0L12.538 1.466L18.077 7.004H14.73L10.864 3.146L9.404 4.606L11.809 7.01H10.129V17.876H20.994V16.196L23.399 18.6L24.859 17.14L20.994 13.274V9.927L26.535 15.462ZM7.73 6.276L6.265 7.738L7.833 9.304L9.294 7.844L7.73 6.276ZM20.162 18.708L18.702 20.17L20.268 21.738L21.73 20.276L20.162 18.708ZM4.596 9.41L3.134 10.872L7 14.738V11.815L4.596 9.41ZM16.192 21.006H13.268L17.134 24.872L18.596 23.41L16.192 21.006Z" fill="#FF6363"/>\n</svg>',
	n8n: '<svg viewBox="0 0 228 120" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M204 48C192.817 48 183.42 40.3514 180.756 30H153.248C147.382 30 142.376 34.241 141.412 40.0272L140.425 45.9456C139.489 51.5648 136.646 56.4554 132.626 60C136.646 63.5446 139.489 68.4352 140.425 74.0544L141.412 79.9728C142.376 85.759 147.382 90 153.248 90H156.756C159.42 79.6486 168.817 72 180 72C193.255 72 204 82.7452 204 96C204 109.255 193.255 120 180 120C168.817 120 159.42 112.351 156.756 102H153.248C141.516 102 131.504 93.5181 129.575 81.9456L128.588 76.0272C127.624 70.241 122.618 66 116.752 66H107.244C104.58 76.3514 95.183 84 84 84C72.817 84 63.4204 76.3514 60.7561 66H47.2439C44.5796 76.3514 35.183 84 24 84C10.7452 84 0 73.2548 0 60C0 46.7452 10.7452 36 24 36C35.183 36 44.5796 43.6486 47.2439 54H60.7561C63.4204 43.6486 72.817 36 84 36C95.183 36 104.58 43.6486 107.244 54H116.752C122.618 54 127.624 49.759 128.588 43.9728L129.575 38.0544C131.504 26.4819 141.516 18 153.248 18L180.756 18C183.42 7.64864 192.817 0 204 0C217.255 0 228 10.7452 228 24C228 37.2548 217.255 48 204 48ZM204 36C210.627 36 216 30.6274 216 24C216 17.3726 210.627 12 204 12C197.373 12 192 17.3726 192 24C192 30.6274 197.373 36 204 36ZM24 72C30.6274 72 36 66.6274 36 60C36 53.3726 30.6274 48 24 48C17.3726 48 12 53.3726 12 60C12 66.6274 17.3726 72 24 72ZM96 60C96 66.6274 90.6274 72 84 72C77.3726 72 72 66.6274 72 60C72 53.3726 77.3726 48 84 48C90.6274 48 96 53.3726 96 60ZM192 96C192 102.627 186.627 108 180 108C173.373 108 168 102.627 168 96C168 89.3726 173.373 84 180 84C186.627 84 192 89.3726 192 96Z" fill="#ea4b71"/></svg>',
	googledrive:
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 87.3 78">\n  <path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z"/>\n  <path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 0 0 0 53h27.5z"/>\n  <path fill="#ea4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.798l5.852 11.5z"/>\n  <path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z"/>\n  <path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"/>\n  <path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z"/>\n</svg>',
	claude:
		'<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 257"><path fill="#D97757" d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z"/></svg>',
	dropbox:
		'<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128"><rect fill="#0061FE" width="128" height="128" rx="35.8" ry="35.8"/><path fill="#F7F5F2" d="M43.7 32 23.404 44.75 43.701 57.5 64 44.75 84.3 57.5l20.298-12.75L84.299 32 64.002 44.75 43.7 32Zm0 51L23.404 70.25 43.701 57.5 64 70.25 43.702 83Zm20.302-12.75L84.299 57.5l20.298 12.75L84.299 83 64.002 70.25Zm0 29.75L43.7 87.25 64 74.5l20.3 12.75L64.002 100Z"/></svg>',
	figma:
		'<svg viewBox="0 0 54 80" fill="none" xmlns="http://www.w3.org/2000/svg">\n<g clip-path="url(#figma_clip0_912_3)">\n<path d="M13.3333 80.0002C20.6933 80.0002 26.6667 74.0268 26.6667 66.6668V53.3335H13.3333C5.97333 53.3335 0 59.3068 0 66.6668C0 74.0268 5.97333 80.0002 13.3333 80.0002Z" fill="#0ACF83"/>\n<path d="M0 39.9998C0 32.6398 5.97333 26.6665 13.3333 26.6665H26.6667V53.3332H13.3333C5.97333 53.3332 0 47.3598 0 39.9998Z" fill="#A259FF"/>\n<path d="M0 13.3333C0 5.97333 5.97333 0 13.3333 0H26.6667V26.6667H13.3333C5.97333 26.6667 0 20.6933 0 13.3333Z" fill="#F24E1E"/>\n<path d="M26.6667 0H40.0001C47.3601 0 53.3334 5.97333 53.3334 13.3333C53.3334 20.6933 47.3601 26.6667 40.0001 26.6667H26.6667V0Z" fill="#FF7262"/>\n<path d="M53.3334 39.9998C53.3334 47.3598 47.3601 53.3332 40.0001 53.3332C32.6401 53.3332 26.6667 47.3598 26.6667 39.9998C26.6667 32.6398 32.6401 26.6665 40.0001 26.6665C47.3601 26.6665 53.3334 32.6398 53.3334 39.9998Z" fill="#1ABCFE"/>\n</g>\n<defs>\n<clipPath id="figma_clip0_912_3">\n<rect width="53.3333" height="80" fill="white"/>\n</clipPath>\n</defs>\n</svg>',
	linear:
		'<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 100 100"><path fill="#5E6AD2" d="M1.225 61.523c-.222-.949.908-1.546 1.597-.857l36.512 36.512c.69.69.092 1.82-.857 1.597-18.425-4.323-32.93-18.827-37.252-37.252ZM.002 46.889a.99.99 0 0 0 .29.76L52.35 99.71c.201.2.478.307.76.29 2.37-.149 4.695-.46 6.963-.927.765-.157 1.03-1.096.478-1.648L2.576 39.448c-.552-.551-1.491-.286-1.648.479a50.067 50.067 0 0 0-.926 6.962ZM4.21 29.705a.988.988 0 0 0 .208 1.1l64.776 64.776c.289.29.726.375 1.1.208a49.908 49.908 0 0 0 5.185-2.684.981.981 0 0 0 .183-1.54L8.436 24.336a.981.981 0 0 0-1.541.183 49.896 49.896 0 0 0-2.684 5.185Zm8.448-11.631a.986.986 0 0 1-.045-1.354C21.78 6.46 35.111 0 49.952 0 77.592 0 100 22.407 100 50.048c0 14.84-6.46 28.172-16.72 37.338a.986.986 0 0 1-1.354-.045L12.659 18.074Z"/></svg>',
	slack:
		'<svg\n  enable-background="new 0 0 2447.6 2452.5"\n  viewBox="0 0 2447.6 2452.5"\n  xmlns="http://www.w3.org/2000/svg"\n>\n  <g clip-rule="evenodd" fill-rule="evenodd">\n    <path\n      d="m897.4 0c-135.3.1-244.8 109.9-244.7 245.2-.1 135.3 109.5 245.1 244.8 245.2h244.8v-245.1c.1-135.3-109.5-245.1-244.9-245.3.1 0 .1 0 0 0m0 654h-652.6c-135.3.1-244.9 109.9-244.8 245.2-.2 135.3 109.4 245.1 244.7 245.3h652.7c135.3-.1 244.9-109.9 244.8-245.2.1-135.4-109.5-245.2-244.8-245.3z"\n      fill="#36c5f0"\n    />\n    <path\n      d="m2447.6 899.2c.1-135.3-109.5-245.1-244.8-245.2-135.3.1-244.9 109.9-244.8 245.2v245.3h244.8c135.3-.1 244.9-109.9 244.8-245.3zm-652.7 0v-654c.1-135.2-109.4-245-244.7-245.2-135.3.1-244.9 109.9-244.8 245.2v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.3z"\n      fill="#2eb67d"\n    />\n    <path\n      d="m1550.1 2452.5c135.3-.1 244.9-109.9 244.8-245.2.1-135.3-109.5-245.1-244.8-245.2h-244.8v245.2c-.1 135.2 109.5 245 244.8 245.2zm0-654.1h652.7c135.3-.1 244.9-109.9 244.8-245.2.2-135.3-109.4-245.1-244.7-245.3h-652.7c-135.3.1-244.9 109.9-244.8 245.2-.1 135.4 109.4 245.2 244.7 245.3z"\n      fill="#ecb22e"\n    />\n    <path\n      d="m0 1553.2c-.1 135.3 109.5 245.1 244.8 245.2 135.3-.1 244.9-109.9 244.8-245.2v-245.2h-244.8c-135.3.1-244.9 109.9-244.8 245.2zm652.7 0v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.2v-653.9c.2-135.3-109.4-245.1-244.7-245.3-135.4 0-244.9 109.8-244.8 245.1 0 0 0 .1 0 0"\n      fill="#e01e5a"\n    />\n  </g>\n</svg>',
	gmail:
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 49.4 512 399.42">\n  <g fill="none" fill-rule="evenodd">\n    <g fill-rule="nonzero">\n      <path fill="#4285f4" d="M34.91 448.818h81.454V251L0 163.727V413.91c0 19.287 15.622 34.91 34.91 34.91z"/>\n      <path fill="#34a853" d="M395.636 448.818h81.455c19.287 0 34.909-15.622 34.909-34.909V163.727L395.636 251z"/>\n      <path fill="#fbbc04" d="M395.636 99.727V251L512 163.727v-46.545c0-43.142-49.25-67.782-83.782-41.891z"/>\n    </g>\n    <path fill="#ea4335" d="M116.364 251V99.727L256 204.455 395.636 99.727V251L256 355.727z"/>\n    <path fill="#c5221f" fill-rule="nonzero" d="M0 117.182v46.545L116.364 251V99.727L83.782 75.291C49.25 49.4 0 74.04 0 117.18z"/>\n  </g>\n</svg>',
	notion:
		'<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 268"><path fill="#FFF" d="M16.092 11.538 164.09.608c18.179-1.56 22.85-.508 34.28 7.801l47.243 33.282C253.406 47.414 256 48.975 256 55.207v182.527c0 11.439-4.155 18.205-18.696 19.24L65.44 267.378c-10.913.517-16.11-1.043-21.825-8.327L8.826 213.814C2.586 205.487 0 199.254 0 191.97V29.726c0-9.352 4.155-17.153 16.092-18.188Z"/><path d="M164.09.608 16.092 11.538C4.155 12.573 0 20.374 0 29.726v162.245c0 7.284 2.585 13.516 8.826 21.843l34.789 45.237c5.715 7.284 10.912 8.844 21.825 8.327l171.864-10.404c14.532-1.035 18.696-7.801 18.696-19.24V55.207c0-5.911-2.336-7.614-9.21-12.66l-1.185-.856L198.37 8.409C186.94.1 182.27-.952 164.09.608ZM69.327 52.22c-14.033.945-17.216 1.159-25.186-5.323L23.876 30.778c-2.06-2.086-1.026-4.69 4.163-5.207l142.274-10.395c11.947-1.043 18.17 3.12 22.842 6.758l24.401 17.68c1.043.525 3.638 3.637.517 3.637L71.146 52.095l-1.819.125Zm-16.36 183.954V81.222c0-6.767 2.077-9.887 8.3-10.413L230.02 60.93c5.724-.517 8.31 3.12 8.31 9.879v153.917c0 6.767-1.044 12.49-10.387 13.008l-161.487 9.361c-9.343.517-13.489-2.594-13.489-10.921ZM212.377 89.53c1.034 4.681 0 9.362-4.681 9.897l-7.783 1.542v114.404c-6.758 3.637-12.981 5.715-18.18 5.715-8.308 0-10.386-2.604-16.609-10.396l-50.898-80.079v77.476l16.1 3.646s0 9.362-12.989 9.362l-35.814 2.077c-1.043-2.086 0-7.284 3.63-8.318l9.351-2.595V109.823l-12.98-1.052c-1.044-4.68 1.55-11.439 8.826-11.965l38.426-2.585 52.958 81.113v-71.76l-13.498-1.552c-1.043-5.733 3.111-9.896 8.3-10.404l35.84-2.087Z"/></svg>',
	perplexity:
		'<svg \nxmlns="http://www.w3.org/2000/svg"   \nviewBox="0 0 48 48">\n<path \nfill="none" \nstroke="#4BC9D1" \nstroke-linecap="round" \nstroke-linejoin="round" \nd="M24 4.5v39M13.73 16.573v-9.99L24 16.573m0 14.5L13.73 41.417V27.01L24 16.573m0 0l10.27-9.99v9.99"/>\n<path \nfill="none" \nstroke="#4BC9D1" \nstroke-linecap="round" \nstroke-linejoin="round" \nd="M13.73 31.396H9.44V16.573h29.12v14.823h-4.29"/>\n<path \nfill="none" \nstroke="#4BC9D1" \nstroke-linecap="round" \nstroke-linejoin="round" \nd="M24 16.573L34.27 27.01v14.407L24 31.073"/>\n</svg>',
	obsidian:
		'<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 332"><defs><radialGradient id="obsidian_a" cx="72.819%" cy="96.934%" r="163.793%" fx="72.819%" fy="96.934%" gradientTransform="rotate(-104 11141.322 0)"><stop offset="0%" stop-color="#FFF" stop-opacity=".4"/><stop offset="100%" stop-opacity=".1"/></radialGradient><radialGradient id="obsidian_b" cx="52.917%" cy="90.632%" r="190.361%" fx="52.917%" fy="90.632%" gradientTransform="rotate(-82 10746.75 0)"><stop offset="0%" stop-color="#FFF" stop-opacity=".6"/><stop offset="100%" stop-color="#FFF" stop-opacity=".1"/></radialGradient><radialGradient id="obsidian_c" cx="31.174%" cy="97.138%" r="178.714%" fx="31.174%" fy="97.138%" gradientTransform="rotate(-77 10724.606 0)"><stop offset="0%" stop-color="#FFF" stop-opacity=".8"/><stop offset="100%" stop-color="#FFF" stop-opacity=".4"/></radialGradient><radialGradient id="obsidian_d" cx="71.813%" cy="99.994%" r="92.086%" fx="71.813%" fy="99.994%" gradientTransform="translate(0 22251839.658) skewY(-90)"><stop offset="0%" stop-color="#FFF" stop-opacity=".3"/><stop offset="100%" stop-opacity=".3"/></radialGradient><radialGradient id="obsidian_e" cx="117.013%" cy="34.769%" r="328.729%" fx="117.013%" fy="34.769%" gradientTransform="rotate(102 -1004.443 0)"><stop offset="0%" stop-color="#FFF" stop-opacity="0"/><stop offset="100%" stop-color="#FFF" stop-opacity=".2"/></radialGradient><radialGradient id="obsidian_f" cx="-9.431%" cy="8.712%" r="153.492%" fx="-9.431%" fy="8.712%" gradientTransform="rotate(45 1674.397 0)"><stop offset="0%" stop-color="#FFF" stop-opacity=".2"/><stop offset="100%" stop-color="#FFF" stop-opacity=".4"/></radialGradient><radialGradient id="obsidian_g" cx="103.902%" cy="-22.172%" r="394.771%" fx="103.902%" fy="-22.172%" gradientTransform="rotate(80 3757.522 0)"><stop offset="0%" stop-color="#FFF" stop-opacity=".1"/><stop offset="100%" stop-color="#FFF" stop-opacity=".3"/></radialGradient><radialGradient id="obsidian_h" cx="99.348%" cy="89.193%" r="203.824%" fx="99.348%" fy="89.193%" gradientTransform="translate(0 -38783246.548) skewY(-90)"><stop offset="0%" stop-color="#FFF" stop-opacity=".2"/><stop offset="50%" stop-color="#FFF" stop-opacity=".2"/><stop offset="100%" stop-color="#FFF" stop-opacity=".3"/></radialGradient></defs><path fill-opacity=".3" d="M209.056 308.305c-2.043 14.93-16.738 26.638-31.432 22.552-20.823-5.658-44.946-14.616-66.634-16.266l-33.317-2.515a22.002 22.002 0 0 1-14.144-6.522L6.167 246.778a21.766 21.766 0 0 1-4.244-24.124s35.36-77.478 36.775-81.485c1.257-4.008 6.13-39.211 8.958-58.07a22.002 22.002 0 0 1 7.072-12.965L122.462 9.47a22.002 22.002 0 0 1 31.903 2.672l57.048 71.978a23.18 23.18 0 0 1 4.872 14.38c0 13.594 1.179 41.646 8.8 59.72a236.756 236.756 0 0 0 27.974 45.732 11.001 11.001 0 0 1 .786 12.258c-4.95 8.408-14.851 24.595-28.76 45.26a111.738 111.738 0 0 0-16.108 46.834h.079Z"/><path fill="#6C31E3" d="M209.606 305.79c-2.043 15.009-16.737 26.717-31.432 22.71-20.744-5.737-44.79-14.695-66.555-16.345L78.38 309.64a21.923 21.923 0 0 1-14.144-6.6L6.874 244.106a21.923 21.923 0 0 1-4.243-24.36s35.438-77.792 36.774-81.878c1.336-4.007 6.13-39.289 8.958-58.305a22.002 22.002 0 0 1 7.072-13.044L123.17 5.621a22.002 22.002 0 0 1 31.902 2.75l56.97 72.292a23.338 23.338 0 0 1 4.871 14.38c0 13.673 1.18 41.804 8.723 59.955a238.092 238.092 0 0 0 27.974 45.969 11.001 11.001 0 0 1 .864 12.336c-5.03 8.487-14.851 24.674-28.838 45.497a112.603 112.603 0 0 0-16.03 46.99Z"/><path fill="url(#obsidian_a)" d="M70.365 307.44c26.638-53.983 25.93-92.722 14.537-120.225-10.372-25.459-29.781-41.489-45.025-51.468a19.233 19.233 0 0 1-1.415 4.243L2.631 219.747a21.923 21.923 0 0 0 4.321 24.36l57.284 58.933a23.762 23.762 0 0 0 6.129 4.4Z"/><path fill="url(#obsidian_b)" d="M142.814 197.902a86.025 86.025 0 0 1 21.06 4.793c21.844 8.172 41.724 26.56 58.147 61.999 1.179-2.043 2.357-4.008 3.615-5.894a960.226 960.226 0 0 0 28.838-45.497 11.001 11.001 0 0 0-.786-12.336 238.092 238.092 0 0 1-28.052-45.969c-7.544-18.073-8.644-46.282-8.723-59.955 0-5.186-1.65-10.294-4.871-14.38l-56.97-72.292-.943-1.178c4.165 13.75 3.93 24.752 1.336 34.731-2.357 9.272-6.757 17.68-11.394 26.56-1.571 2.986-3.143 6.05-4.636 9.193a110.01 110.01 0 0 0-12.415 45.576c-.786 19.016 3.064 42.825 15.716 74.65h.078Z"/><path fill="url(#obsidian_c)" d="M142.736 197.902c-12.652-31.824-16.502-55.633-15.716-74.65.786-18.858 6.286-33.002 12.415-45.575l4.715-9.193c4.558-8.88 8.88-17.288 11.315-26.56a61.684 61.684 0 0 0-1.336-34.731c-8.136-8.94-21.96-9.642-30.96-1.572L55.436 66.519a22.002 22.002 0 0 0-7.072 13.044l-8.25 54.69c0 .55-.158 1.022-.236 1.572 15.244 9.901 34.574 25.931 45.025 51.312 2.043 5.029 3.772 10.294 5.029 16.03a157.157 157.157 0 0 1 52.805-5.343v.078Z"/><path fill="url(#obsidian_d)" d="M178.253 328.5c14.616 4.007 29.31-7.701 31.353-22.789a120.225 120.225 0 0 1 12.494-41.017c-16.502-35.44-36.382-53.827-58.148-61.999-23.18-8.643-48.404-5.736-74.021.472 5.736 26.01 2.357 60.034-19.487 104.273 2.436 1.257 5.186 1.965 7.936 2.2l34.496 2.593c18.701 1.336 46.597 11.001 65.377 16.266Z"/><path fill="url(#obsidian_e)" d="M127.177 122.074c-.864 18.859 1.493 40.39 14.144 72.135l-3.929-.393c-11.394-33.081-13.908-50.054-13.044-69.149.786-19.094 6.994-33.789 13.123-46.361 1.571-3.143 5.186-9.037 6.758-12.023 4.557-8.879 7.622-13.515 10.215-21.609 3.772-11.315 2.986-16.658 2.514-22.001 2.908 19.251-8.172 35.988-16.501 53.04a113.939 113.939 0 0 0-13.358 46.361h.078Z"/><path fill="url(#obsidian_f)" d="M88.674 188.551c1.571 3.458 2.907 6.287 3.85 10.608l-3.379.786c-1.336-5.029-2.357-8.643-4.322-12.965-11.472-26.953-29.86-40.861-44.79-51.076 18.074 9.744 36.697 25.066 48.64 52.647Z"/><path fill="url(#obsidian_g)" d="M92.681 202.617c6.286 29.467-.786 66.948-21.609 103.409 17.445-36.146 25.931-70.8 18.859-102.938l2.75-.55v.079Z"/><path fill="url(#obsidian_h)" d="M164.659 199.867c34.181 12.808 47.383 40.86 57.205 64.355-12.18-24.516-29.074-51.626-58.462-61.684-22.317-7.7-41.175-6.758-73.471.55l-.707-3.143c34.26-7.858 52.176-8.8 75.435 0v-.078Z"/></svg>',
	githubcopilot:
		'<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 208"><path fill="#fff" d="M205.3 31.4c14 14.8 20 35.2 22.5 63.6 6.6 0 12.8 1.5 17 7.2l7.8 10.6c2.2 3 3.4 6.6 3.4 10.4v28.7a12 12 0 0 1-4.8 9.5C215.9 187.2 172.3 208 128 208c-49 0-98.2-28.3-123.2-46.6a12 12 0 0 1-4.8-9.5v-28.7c0-3.8 1.2-7.4 3.4-10.5l7.8-10.5c4.2-5.7 10.4-7.2 17-7.2 2.5-28.4 8.4-48.8 22.5-63.6C77.3 3.2 112.6 0 127.6 0h.4c14.7 0 50.4 2.9 77.3 31.4ZM128 78.7c-3 0-6.5.2-10.3.6a27.1 27.1 0 0 1-6 12.1 45 45 0 0 1-32 13c-6.8 0-13.9-1.5-19.7-5.2-5.5 1.9-10.8 4.5-11.2 11-.5 12.2-.6 24.5-.6 36.8 0 6.1 0 12.3-.2 18.5 0 3.6 2.2 6.9 5.5 8.4C79.9 185.9 105 192 128 192s48-6 74.5-18.1a9.4 9.4 0 0 0 5.5-8.4c.3-18.4 0-37-.8-55.3-.4-6.6-5.7-9.1-11.2-11-5.8 3.7-13 5.1-19.7 5.1a45 45 0 0 1-32-12.9 27.1 27.1 0 0 1-6-12.1c-3.4-.4-6.9-.5-10.3-.6Zm-27 44c5.8 0 10.5 4.6 10.5 10.4v19.2a10.4 10.4 0 0 1-20.8 0V133c0-5.8 4.6-10.4 10.4-10.4Zm53.4 0c5.8 0 10.4 4.6 10.4 10.4v19.2a10.4 10.4 0 0 1-20.8 0V133c0-5.8 4.7-10.4 10.4-10.4Zm-73-94.4c-11.2 1.1-20.6 4.8-25.4 10-10.4 11.3-8.2 40.1-2.2 46.2A31.2 31.2 0 0 0 75 91.7c6.8 0 19.6-1.5 30.1-12.2 4.7-4.5 7.5-15.7 7.2-27-.3-9.1-2.9-16.7-6.7-19.9-4.2-3.6-13.6-5.2-24.2-4.3Zm69 4.3c-3.8 3.2-6.4 10.8-6.7 19.9-.3 11.3 2.5 22.5 7.2 27a41.7 41.7 0 0 0 30 12.2c8.9 0 17-2.9 21.3-7.2 6-6.1 8.2-34.9-2.2-46.3-4.8-5-14.2-8.8-25.4-9.9-10.6-1-20 .7-24.2 4.3ZM128 56c-2.6 0-5.6.2-9 .5.4 1.7.5 3.7.7 5.7 0 1.5 0 3-.2 4.5 3.2-.3 6-.3 8.5-.3 2.6 0 5.3 0 8.5.3-.2-1.6-.2-3-.2-4.5.2-2 .3-4 .7-5.7-3.4-.3-6.4-.5-9-.5Z"/></svg>',
	mcp: '<svg viewBox="0 0 24 24"><path fill="#eef3ff" fill-rule="evenodd" d="M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z"/></svg>',
}
const INTEG: {
	key?: string
	label?: string
	sub?: string
	ring: number
	ang: number
	size: number
	dim: boolean
	_x?: number
	_y?: number
}[] = [
	{ ring: 0, ang: 0.0, size: 80, dim: false, key: "claude" },
	{ ring: 0, ang: 60.0, size: 80, dim: false, key: "openai" },
	{ ring: 0, ang: 120.0, size: 80, dim: false, key: "googlegemini" },
	{ ring: 0, ang: 180.0, size: 80, dim: false, key: "githubcopilot" },
	{ ring: 0, ang: 240.0, size: 80, dim: false, key: "perplexity" },
	{ ring: 0, ang: 300.0, size: 80, dim: false, key: "mcp", sub: "MCP" },
	{ ring: 1, ang: 18.0, size: 58, dim: true, key: "notion" },
	{ ring: 1, ang: 54.0, size: 58, dim: true, key: "slack" },
	{ ring: 1, ang: 90.0, size: 58, dim: true, key: "linear" },
	{ ring: 1, ang: 126.0, size: 58, dim: true, key: "figma" },
	{ ring: 1, ang: 162.0, size: 58, dim: true, key: "googledrive" },
	{ ring: 1, ang: 198.0, size: 58, dim: true, key: "gmail" },
	{ ring: 1, ang: 234.0, size: 58, dim: true, key: "obsidian" },
	{ ring: 1, ang: 270.0, size: 58, dim: true, key: "dropbox" },
	{ ring: 1, ang: 306.0, size: 58, dim: true, key: "n8n" },
	{ ring: 1, ang: 342.0, size: 58, dim: true, key: "raycast" },
]
const DW = 780
const DH = 1024
const CX = 390
const CY = 512
const RR = [200, 335]
const SPEED = [1.0, 0.78]
const DRAW: [number, number, number, string][] = [
	[125, 0.28, 1.7, "#74a8f6"],
	[200, 0.18, 1.9, "#4389ff"],
	[335, 0.14, 1.8, "#4389ff"],
	[378, 0.05, 1.7, "#74a8f6"],
]
const ACCENT: Record<string, string> = {
	claude: "217,119,87",
	openai: "190,210,245",
	googlegemini: "80,130,255",
	githubcopilot: "190,210,245",
	perplexity: "32,184,205",
	mcp: "190,210,245",
	notion: "205,213,235",
	slack: "54,197,240",
	linear: "110,120,230",
	figma: "162,89,255",
	googledrive: "0,180,90",
	gmail: "234,67,53",
	obsidian: "138,99,246",
	dropbox: "40,120,255",
	n8n: "234,75,113",
	raycast: "255,99,99",
}
const NC = 2
const HL = 22
const P1 =
	"M86.9333 31.8278H56.1203V5.39087H46.1648V34.0754C46.1648 37.122 47.3832 40.0479 49.5488 42.2037L74.7085 67.2494L81.7477 60.2421L63.1652 41.7439H86.9389V31.8336L86.9333 31.8278Z"
const P2 =
	"M10.4478 17.1572L28.5503 35.6573H5.39062V45.5685H35.4075V72.0078H45.1057V43.3207C45.1057 40.2736 43.9188 37.3474 41.8091 35.1917L17.3051 10.1492L10.4478 17.1572Z"
const SPARK_HTML = `<svg viewBox="0 1 93 76" fill="none" xmlns="http://www.w3.org/2000/svg"><g filter="url(#smf)"><path d="${P1}" fill="#fff"/><path d="${P1}" fill="url(#smg)"/><path d="${P2}" fill="#fff"/><path d="${P2}" fill="url(#smg)"/></g><defs><filter id="smf" x="0" y="0" width="177" height="163" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="bg"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="ha"/><feOffset dx="2.69545" dy="2.69545"/><feGaussianBlur stdDeviation="4.04317"/><feColorMatrix type="matrix" values="0 0 0 0 0.0352941 0 0 0 0 0 0 0 0 0 0.521569 0 0 0 0.52 0"/><feBlend mode="normal" in2="bg" result="e1"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="ha"/><feOffset dx="10.3967" dy="10.3967"/><feGaussianBlur stdDeviation="7.31622"/><feColorMatrix type="matrix" values="0 0 0 0 0.0352941 0 0 0 0 0 0 0 0 0 0.521569 0 0 0 0.45 0"/><feBlend mode="normal" in2="e1" result="e2"/><feBlend mode="normal" in="SourceGraphic" in2="e2" result="shape"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="ha"/><feOffset dx="1.14857" dy="-1.15519"/><feGaussianBlur stdDeviation="0.96266"/><feComposite in2="ha" operator="arithmetic" k2="-1" k3="1"/><feColorMatrix type="matrix" values="0 0 0 0 0.508019 0 0 0 0 0.631014 0 0 0 0 1 0 0 0 1 0"/><feBlend mode="normal" in2="shape" result="e6"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="ha"/><feOffset dx="3.4457" dy="13.7828"/><feGaussianBlur stdDeviation="3.13827"/><feComposite in2="ha" operator="arithmetic" k2="-1" k3="1"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/><feBlend mode="normal" in2="e6"/></filter><linearGradient id="smg" x1="25.2126" y1="23.8956" x2="24.5316" y2="79.8321" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset="0.4183" stop-color="#CDE5FF"/><stop offset="0.6731" stop-color="#A1CFFF"/><stop offset="1" stop-color="#0063CD"/></linearGradient></defs></svg>`

export default function OrbitMemory({
	className = "",
	style,
	grain = true,
}: {
	className?: string
	style?: React.CSSProperties
	grain?: boolean
}) {
	const stageRef = useRef<HTMLDivElement>(null)
	const tileRefs = useRef<HTMLDivElement[]>([])
	const trackRef = useRef<SVGLineElement>(null)
	const cmRefs = useRef<SVGLineElement[]>([])
	const cmgRefs = useRef<SVGLineElement[]>([])
	const gradRefs = useRef<SVGLinearGradientElement[]>([])
	const logoRef = useRef<HTMLDivElement>(null)
	const ringRefs = useRef<HTMLElement[]>([])
	const dtrackRef = useRef<SVGLineElement>(null)
	const omRefs = useRef<SVGLineElement[]>([])
	const omgRefs = useRef<SVGLineElement[]>([])
	const ogRefs = useRef<SVGLinearGradientElement[]>([])

	useEffect(() => {
		const stage = stageRef.current
		if (!stage) return
		const nodes = tileRefs.current
		const track = trackRef.current!
		const cms = cmRefs.current
		const cmgs = cmgRefs.current
		const grads = gradRefs.current
		const dtrack = dtrackRef.current!
		const oms = omRefs.current
		const omgs = omgRefs.current
		const ogrs = ogRefs.current
		let scale = 1
		const measure = () => {
			scale = stage.clientWidth / DW
		}
		measure()
		const ro = new ResizeObserver(measure)
		ro.observe(stage)
		const setLine = (
			el: Element,
			ax: number,
			ay: number,
			bx: number,
			by: number,
		) => {
			el.setAttribute("x1", ax.toFixed(1))
			el.setAttribute("y1", ay.toFixed(1))
			el.setAttribute("x2", bx.toFixed(1))
			el.setAttribute("y2", by.toFixed(1))
		}
		const hideConn = () => {
			track.setAttribute("stroke-opacity", "0")
			dtrack.setAttribute("stroke-opacity", "0")
			for (let k = 0; k < NC; k++) {
				cms[k].setAttribute("opacity", "0")
				cmgs[k].setAttribute("opacity", "0")
				oms[k].setAttribute("opacity", "0")
				omgs[k].setAttribute("opacity", "0")
			}
		}
		let angle = 0
		const place = () => {
			for (let i = 0; i < INTEG.length; i++) {
				const it = INTEG[i]
				const a = ((it.ang + angle * SPEED[it.ring]) * Math.PI) / 180
				const R = RR[it.ring]
				const ux = CX + R * Math.cos(a)
				const uy = CY + R * Math.sin(a)
				it._x = ux
				it._y = uy
				const n = nodes[i]
				if (n)
					n.style.transform = `translate(-50%,-50%) translate(${((ux - CX) * scale).toFixed(2)}px,${((uy - CY) * scale).toFixed(2)}px)`
			}
		}
		if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
			place()
			hideConn()
			return () => ro.disconnect()
		}
		const ORBIT = 2200
		const RECV = 2000
		const SEND = 2000
		const DISC = 700
		const INN: number[] = []
		const OUT: number[] = []
		for (let i = 0; i < INTEG.length; i++) {
			;(INTEG[i].ring === 0 ? INN : OUT).push(i)
		}
		let phase = "orbit"
		let pT0 = 0
		let ci = 0
		let src = -1
		let dst = -1
		let last = 0
		let raf = 0
		let lastPing = 0
		let ri = 0
		const rings = ringRefs.current
		const ping = () => {
			const el = rings[ri++ % rings.length]
			if (!el) return
			el.getAnimations().forEach((a) => {
				a.cancel()
			})
			el.animate(
				[
					{ transform: "scale(1)", opacity: 0, offset: 0 },
					{ transform: "scale(1.55)", opacity: 0.7, offset: 0.22 },
					{ transform: "scale(2)", opacity: 0.55, offset: 0.55 },
					{ transform: "scale(2.45)", opacity: 0, offset: 1 },
				],
				{ duration: 2400, easing: "linear" },
			)
		}
		const BASE = 360 / 90 / 1000
		const eo = (t: number) => 1 - (1 - t) ** 3
		const ei = (t: number) => t * t * t
		const seg = (
			now: number,
			trk: SVGLineElement,
			nx: number,
			ny: number,
			P: number,
			gr: SVGLinearGradientElement[],
			cr: SVGLineElement[],
			gl: SVGLineElement[],
			dir: number,
			off: number,
		) => {
			setLine(trk, CX, CY, nx, ny)
			trk.setAttribute("stroke-opacity", (0.62 * P).toFixed(2))
			const dx = nx - CX
			const dy = ny - CY
			const len = Math.hypot(dx, dy) || 1
			const ux = dx / len
			const uy = dy / len
			for (let k = 0; k < NC; k++) {
				const f = (now / 1500 + (k + off) / NC) % 1
				const t = dir < 0 ? 1 - f : f
				const pxc = CX + dx * t
				const pyc = CY + dy * t
				const ax = pxc - ux * HL
				const ay = pyc - uy * HL
				const bx = pxc + ux * HL
				const by = pyc + uy * HL
				setLine(gr[k], ax, ay, bx, by)
				setLine(cr[k], ax, ay, bx, by)
				setLine(gl[k], ax, ay, bx, by)
				const o = Math.sin(f * Math.PI) * P
				cr[k].setAttribute("opacity", o.toFixed(2))
				gl[k].setAttribute("opacity", (0.6 * o).toFixed(2))
			}
		}
		const frame = (now: number) => {
			if (!last) last = now
			const dt = Math.min(now - last, 50)
			last = now
			if (!pT0) pT0 = now
			const pt = now - pT0
			if (phase === "orbit" && pt > ORBIT) {
				phase = "receive"
				pT0 = now
				src = INN[(ci * 5) % INN.length]
				dst = OUT[(ci * 7) % OUT.length]
				ci++
				nodes[src]?.classList.add("sm-active")
				stage.style.setProperty(
					"--cm",
					`rgb(${ACCENT[INTEG[src].key!] || "91,157,255"})`,
				)
			} else if (phase === "receive" && pt > RECV) {
				phase = "send"
				pT0 = now
				nodes[dst]?.classList.add("sm-active")
			} else if (phase === "send" && pt > SEND) {
				phase = "disconnect"
				pT0 = now
				nodes[src]?.classList.remove("sm-active")
				nodes[dst]?.classList.remove("sm-active")
			} else if (phase === "disconnect" && pt > DISC) {
				phase = "orbit"
				pT0 = now
				src = -1
				dst = -1
			}
			angle += BASE * dt
			place()
			if (phase === "send" && now - lastPing > 820) {
				ping()
				lastPing = now
			}
			if (src < 0) {
				hideConn()
			} else {
				const cpt = now - pT0
				let ps = 1
				if (phase === "receive") ps = eo(Math.min(cpt / RECV, 1))
				else if (phase === "disconnect") ps = 1 - ei(Math.min(cpt / DISC, 1))
				let pd = 0
				if (phase === "send") pd = eo(Math.min(cpt / SEND, 1))
				else if (phase === "disconnect") pd = 1 - ei(Math.min(cpt / DISC, 1))
				seg(
					now,
					track,
					INTEG[src]._x!,
					INTEG[src]._y!,
					ps,
					grads,
					cms,
					cmgs,
					-1,
					0,
				)
				seg(
					now,
					dtrack,
					INTEG[dst]._x!,
					INTEG[dst]._y!,
					pd,
					ogrs,
					oms,
					omgs,
					1,
					0.5,
				)
			}
			raf = requestAnimationFrame(frame)
		}
		raf = requestAnimationFrame(frame)
		return () => {
			cancelAnimationFrame(raf)
			ro.disconnect()
		}
	}, [])

	return (
		<div
			ref={stageRef}
			className={`sm-orbit ${className}`}
			style={style}
			aria-hidden
		>
			<style>{CSS}</style>
			<div className="sm-glow sm-glow-1" />
			<div className="sm-glow sm-glow-2" />
			<div className="sm-glow sm-glow-3" />
			<svg
				aria-hidden="true"
				className="sm-lines"
				viewBox={`0 0 ${DW} ${DH}`}
				preserveAspectRatio="xMidYMid meet"
			>
				<defs>
					<filter id="sm-cglow" x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur stdDeviation={2.6} />
					</filter>
					{[0, 1].map((k) => (
						<linearGradient
							key={k}
							id={`sm-cg${k}`}
							gradientUnits="userSpaceOnUse"
							ref={(el) => {
								if (el) gradRefs.current[k] = el
							}}
						>
							<stop offset="0" stopColor="var(--cm,#5b9dff)" stopOpacity="0" />
							<stop
								offset="0.5"
								stopColor="var(--cm,#5b9dff)"
								stopOpacity="1"
							/>
							<stop offset="1" stopColor="var(--cm,#5b9dff)" stopOpacity="0" />
						</linearGradient>
					))}
					{[0, 1].map((k) => (
						<linearGradient
							key={`o${k}`}
							id={`sm-og${k}`}
							gradientUnits="userSpaceOnUse"
							ref={(el) => {
								if (el) ogRefs.current[k] = el
							}}
						>
							<stop offset="0" stopColor="#e3eeff" stopOpacity="0" />
							<stop offset="0.5" stopColor="#e3eeff" stopOpacity="1" />
							<stop offset="1" stopColor="#e3eeff" stopOpacity="0" />
						</linearGradient>
					))}
				</defs>

				{DRAW.map(([r, o, w, c]) => (
					<circle
						key={`track-${r}`}
						cx={CX}
						cy={CY}
						r={r}
						fill="none"
						stroke={c}
						strokeOpacity={o}
						strokeWidth={w}
						strokeLinecap="round"
						strokeDasharray="0.7 7"
					/>
				))}

				<line
					ref={trackRef}
					stroke="#9097a6"
					strokeOpacity={0}
					strokeWidth={1.5}
					strokeDasharray="4 5"
					strokeLinecap="butt"
				/>
				<line
					ref={dtrackRef}
					stroke="#9097a6"
					strokeOpacity={0}
					strokeWidth={1.5}
					strokeDasharray="4 5"
					strokeLinecap="butt"
				/>
				{[0, 1].map((k) => (
					<line
						key={`g${k}`}
						ref={(el) => {
							if (el) cmgRefs.current[k] = el
						}}
						stroke={`url(#sm-cg${k})`}
						strokeWidth={5.5}
						strokeLinecap="round"
						opacity={0}
						filter="url(#sm-cglow)"
					/>
				))}
				{[0, 1].map((k) => (
					<line
						key={`c${k}`}
						ref={(el) => {
							if (el) cmRefs.current[k] = el
						}}
						stroke={`url(#sm-cg${k})`}
						strokeWidth={2.3}
						strokeLinecap="round"
						opacity={0}
					/>
				))}
				{[0, 1].map((k) => (
					<line
						key={`og${k}`}
						ref={(el) => {
							if (el) omgRefs.current[k] = el
						}}
						stroke={`url(#sm-og${k})`}
						strokeWidth={5}
						strokeLinecap="round"
						opacity={0}
						filter="url(#sm-cglow)"
					/>
				))}
				{[0, 1].map((k) => (
					<line
						key={`o${k}`}
						ref={(el) => {
							if (el) omRefs.current[k] = el
						}}
						stroke={`url(#sm-og${k})`}
						strokeWidth={2.1}
						strokeLinecap="round"
						opacity={0}
					/>
				))}
			</svg>
			<div className="sm-tiles">
				{INTEG.map((it, i) => (
					<div
						key={it.key ?? it.label}
						ref={(el) => {
							if (el) tileRefs.current[i] = el
						}}
						className={`sm-tile${it.dim ? " sm-dim" : ""}`}
						style={
							{
								width: `${((it.size / DW) * 100).toFixed(3)}cqmin`,
								height: `${((it.size / DW) * 100).toFixed(3)}cqmin`,
								["--s" as unknown as string]: `${((it.size / DW) * 100).toFixed(3)}cqmin`,
								["--ac" as unknown as string]: ACCENT[it.key!] || "47,123,255",
							} as React.CSSProperties
						}
					>
						{it.sub ? (
							<span className="sm-iconsub">
								<span
									className="sm-glyph"
									// biome-ignore lint/security/noDangerouslySetInnerHtml: static, vetted inline brand SVG markup
									dangerouslySetInnerHTML={{ __html: ICONS[it.key!] }}
								/>
								<span className="sm-gsub">{it.sub}</span>
							</span>
						) : it.label ? (
							<span className="sm-glabel">{it.label}</span>
						) : (
							<span
								className="sm-glyph"
								// biome-ignore lint/security/noDangerouslySetInnerHtml: static, vetted inline brand SVG markup
								dangerouslySetInnerHTML={{ __html: ICONS[it.key!] }}
							/>
						)}
					</div>
				))}
			</div>
			<div className="sm-core">
				<div className="sm-cglow" />
				{(["ring-0", "ring-1", "ring-2", "ring-3"] as const).map((rk, k) => (
					<i
						key={rk}
						className="sm-ring"
						ref={(el) => {
							if (el) ringRefs.current[k] = el
						}}
					/>
				))}
				<div className="sm-clogo" ref={logoRef}>
					<div className="sm-tile2" />
					<div
						className="sm-spark"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: static, vetted inline brand SVG markup
						dangerouslySetInnerHTML={{ __html: SPARK_HTML }}
					/>
				</div>
			</div>
			{grain && <div className="sm-grain" />}
		</div>
	)
}

const CSS = `
.sm-orbit{position:relative;width:100%;height:100%;container-type:size;overflow:hidden;isolation:isolate;background:#05060b;--ease-soft:cubic-bezier(.45,0,.55,1)}
.sm-glow{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:50%;pointer-events:none}
.sm-glow-1{width:150cqmin;height:150cqmin;background:radial-gradient(circle, rgba(8,100,240,.40) 0%, rgba(6,98,239,.20) 28%, rgba(6,98,239,.08) 50%, transparent 70%);opacity:.68}
.sm-glow-2{width:92cqmin;height:92cqmin;background:radial-gradient(circle, rgba(50,126,255,.46) 0%, rgba(47,123,255,.18) 38%, transparent 66%);opacity:.66}
.sm-glow-3{width:54cqmin;height:54cqmin;background:radial-gradient(circle, rgba(98,158,255,.70) 0%, rgba(30,100,240,.28) 42%, transparent 68%);opacity:.8}
.sm-lines{position:absolute;inset:0;width:100%;height:100%;z-index:2;overflow:visible}
.sm-tiles{position:absolute;inset:0;z-index:6}
.sm-tile{--ac:47,123,255;position:absolute;left:50%;top:50%;display:grid;place-items:center;border-radius:28%;background:rgba(15,19,31,.94);border:0.3px solid rgba(245,247,252,.12);box-shadow:0 calc(var(--s)*0.1111) calc(var(--s)*0.2778) calc(var(--s)*-0.0694) rgba(0,0,0,.5),inset 0 calc(var(--s)*0.0139) calc(var(--s)*0.0097) rgba(255,255,255,.12),inset 0 calc(var(--s)*0.1804) calc(var(--s)*0.1804) rgba(0,0,0,.25),inset 0 calc(var(--s)*-0.1353) calc(var(--s)*0.1804) rgba(0,0,0,.25),inset 0 calc(var(--s)*-0.0451) calc(var(--s)*0.1804) rgba(186,209,255,.25),0 calc(var(--s)*0.1227) calc(var(--s)*0.2863) rgba(3,4,28,.39),0 calc(var(--s)*0.5317) calc(var(--s)*0.5317) rgba(3,4,28,.34),0 calc(var(--s)*1.1452) calc(var(--s)*0.6953) rgba(3,4,28,.2),0 calc(var(--s)*2.045) calc(var(--s)*0.818) rgba(3,4,28,.06),0 calc(var(--s)*-0.1636) calc(var(--s)*4.09) rgba(41,130,255,.5);transition:box-shadow .5s var(--ease-soft),border-color .5s var(--ease-soft),border-width .5s var(--ease-soft);will-change:transform}
.sm-tile.sm-active{border-color:rgba(var(--ac),.6);border-width:0.3px;box-shadow:0 calc(var(--s)*0.1111) calc(var(--s)*0.2778) calc(var(--s)*-0.0694) rgba(0,0,0,.5),inset 0 calc(var(--s)*0.0139) calc(var(--s)*0.0097) rgba(255,255,255,.12),inset 0 calc(var(--s)*0.1804) calc(var(--s)*0.1804) rgba(var(--ac),.3),inset 0 calc(var(--s)*-0.1353) calc(var(--s)*0.1804) rgba(0,0,0,.25),inset 0 calc(var(--s)*-0.0451) calc(var(--s)*0.1804) rgba(186,209,255,.25),0 calc(var(--s)*0.1227) calc(var(--s)*0.2863) rgba(3,4,28,.39),0 calc(var(--s)*0.5317) calc(var(--s)*0.5317) rgba(3,4,28,.34),0 calc(var(--s)*1.1452) calc(var(--s)*0.6953) rgba(3,4,28,.2),0 calc(var(--s)*2.045) calc(var(--s)*0.818) rgba(3,4,28,.06),0 calc(var(--s)*-0.1636) calc(var(--s)*4.09) rgba(var(--ac),.62)}
.sm-glyph{width:46%;height:46%;color:#eef3ff;opacity:.92;display:grid;place-items:center}
.sm-glyph svg{width:100%;height:100%;display:block}
.sm-tile.sm-dim .sm-glyph{opacity:.72}
.sm-tile.sm-active .sm-glyph{color:#fff;opacity:1}
.sm-glabel{font:600 2.55cqmin/1 -apple-system,system-ui,sans-serif;letter-spacing:.08em;color:#eef3ff;opacity:.92}
.sm-iconsub{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5cqmin;width:100%;height:100%}
.sm-iconsub .sm-glyph{width:42%;height:42%}
.sm-gsub{font:600 1.4cqmin/1 -apple-system,system-ui,sans-serif;letter-spacing:.01em;color:#cfe0ff;opacity:.8}
.sm-tile.sm-active .sm-gsub{color:#e6f0ff;opacity:1}
.sm-tile.sm-active .sm-glabel{color:#fff;opacity:1}
.sm-grain{position:absolute;inset:0;z-index:7;pointer-events:none;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27200%27%20height%3D%27200%27%3E%3Cfilter%20id%3D%27n%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%270.9%27%20numOctaves%3D%272%27%20stitchTiles%3D%27stitch%27%2F%3E%3CfeColorMatrix%20type%3D%27saturate%27%20values%3D%270%27%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20filter%3D%27url%28%23n%29%27%2F%3E%3C%2Fsvg%3E");background-size:200px 200px}
.sm-core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:5;width:0;height:0;display:grid;place-items:center}
.sm-core>*{position:absolute}
.sm-cglow{width:43.6cqmin;height:43.6cqmin;border-radius:50%;background:rgba(47,123,255,.63);filter:blur(7.7cqmin);pointer-events:none}
.sm-clogo{width:0;height:0;display:grid;place-items:center;will-change:transform}
.sm-clogo>*{position:absolute}
.sm-ring{position:absolute;width:17cqmin;height:17cqmin;border-radius:50%;background:radial-gradient(circle, transparent 56%, rgba(130,185,255,.6) 74%, rgba(175,210,255,.22) 84%, transparent 100%);mix-blend-mode:screen;opacity:0;will-change:transform,opacity;pointer-events:none}
.sm-tile2{width:17.7cqmin;height:17.7cqmin;border-radius:29%;background:linear-gradient(180deg,#293047 0%,#384369 19%,#21273f 51%,#141824 100%);box-shadow:inset 0 .5cqmin .55cqmin rgba(0,0,0,.28),inset 0 -.4cqmin .55cqmin rgba(0,0,0,.28),inset 0 -.14cqmin .55cqmin rgba(186,209,255,.32),0 .35cqmin .85cqmin rgba(3,4,28,.4),0 1.55cqmin 1.55cqmin rgba(3,4,28,.34),0 3.3cqmin 2cqmin rgba(3,4,28,.2),0 -.5cqmin 9cqmin rgba(41,130,255,.5)}
.sm-spark{width:12cqmin;height:9.8cqmin;display:grid;place-items:center}
.sm-spark svg{width:100%;height:100%;display:block;overflow:visible}
`
