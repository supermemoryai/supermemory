'use client'

import { useEffect } from "react"

function MessagePoster({ jwt }: { jwt: string }) {

    useEffect(() => {
        if (typeof window === 'undefined') return

        // post every 1000ms
        setInterval(() => {
            window.postMessage({ jwt }, '*')
        }, 1000)
    }
        , [jwt])

    return null
}

export default MessagePoster