"use client"

import { useSidebar } from "@/components/ui/sidebar"
import { useEffect, useState } from "react"

export default function DynamicMain({ children }: { children: React.ReactNode }) {
  const { open, animate } = useSidebar()
  const [width, setWidth] = useState(280)

  useEffect(() => {
    if (animate) {
      setWidth(open ? 280 : 80)
    } else {
      setWidth(280)
    }
  }, [open, animate])

  return (
    <main
      className="transition-all duration-300 bg-white min-h-screen"
      style={{
        marginLeft: `${width}px`,
      }}
    >
      <div className="p-4 sm:p-6 lg:p-6 xl:p-8 2xl:p-10 max-w-[1920px] mx-auto bg-white">
        {children}
      </div>
    </main>
  )
}

