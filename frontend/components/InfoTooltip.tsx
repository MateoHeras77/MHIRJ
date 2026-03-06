"use client"

import type { ReactNode } from 'react'
import { Info } from "lucide-react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type InfoTooltipProps = {
  label: string
  children: ReactNode
  className?: string
}

export function InfoTooltip({ label, children, className }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className={cn(
              "inline-flex size-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:outline-none",
              className
            )}
          >
            <Info className="size-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}