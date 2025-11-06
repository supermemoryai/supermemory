"use client"

import { Logo } from "@ui/assets/Logo"
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar"
import { useAuth } from "@lib/auth-context"
import { useEffect, useState } from "react"
import { ChevronsLeftRight, Plus } from "lucide-react"
import { Button } from "@ui/components/button"

export function Header() {
    const { user } = useAuth()
    const [name, setName] = useState<string>("")

    useEffect(() => {
        const storedName =
            localStorage.getItem("username") || localStorage.getItem("userName") || ""
        setName(storedName)
    }, [])
	return (
		<div className="flex p-4 justify-between items-center">
            <div className="flex items-center justify-center gap-4">
                <div className="flex items-center">
                    <Logo className="h-7" />
                    {name && (
                        <div className="flex flex-col items-start justify-center ml-2">
                            <p className="text-[#8B8B8B] text-sm leading-tight">{name}'s</p>
                            <p className="text-white font-bold text-xl leading-none -mt-1">
                                supermemory
                            </p>
                        </div>
                    )}
                </div>
                <div className="self-stretch w-[2px] bg-[#FFFFFF33]" />
                <div className="flex items-center gap-2">
                    <p>📁 My Space</p>
                    <ChevronsLeftRight className="size-4 rotate-90" />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="headers" className="rounded-full text-base gap-2 !h-10">
                    <div className="flex items-center gap-2">
                    <Plus className="size-4" />
                    Add memory
                    </div>
                    <span className="bg-[#21212180] border border-[#73737333] text-[#737373] rounded-md px-1 py-0.5 size-6 text-xs">c</span>
                </Button>
                {user && (
                    <Avatar className="border border-border h-8 w-8 md:h-10 md:w-10">
                        <AvatarImage src={user?.image ?? ""} />
                        <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                )}
            </div>
		</div>
	)
}
