"use client";

import { Button } from "@ui/components/button";
import { ArrowRightIcon, ChevronRightIcon } from "lucide-react";

export function Welcome() {
    return (
        <div className="flex flex-col gap-4 items-center text-center">
            <h1 className="text-white">Welcome to Supermemory</h1>
            <p className="text-white/80 text-2xl">
                We're excited to have you on board.
            </p>

            <a href="/" className="tracking-normal w-fit flex items-center justify-center text-2xl underline cursor-pointer font-medium text-white/80">
                Get started
                <ArrowRightIcon className="size-4 ml-2" />
            </a>
        </div>
    );
}