"use client"

import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"

type ExportReportButtonProps = {
  label?: string
}

export function ExportReportButton({ label = "Export Report" }: ExportReportButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2 border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 print:hidden"
      onClick={() => window.print()}
      aria-label={`${label} as PDF using the browser print dialog`}
    >
      <Download className="size-4" aria-hidden="true" />
      {label}
    </Button>
  )
}