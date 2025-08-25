"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function CollapsibleSidebar({
  children,
  defaultWidth = 320,
  minWidth = 200,
  maxWidth = 500,
  className = "",
}: {
  children: React.ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  className?: string
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const stopResizing = () => {
    setIsResizing(false)
    document.body.style.cursor = 'default'
    document.body.style.userSelect = ''
  }

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX
      if (newWidth > minWidth && newWidth < maxWidth) {
        setWidth(newWidth)
      }
    }
  }

  useEffect(() => {
    window.addEventListener('mousemove', resize)
    window.addEventListener('mouseup', stopResizing)
    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [isResizing])

  return (
    <div 
      className={cn(
        "relative h-full bg-background border-r border-border flex flex-col transition-all duration-200 ease-in-out",
        isCollapsed ? 'w-12' : 'w-[320px]',
        className
      )}
      style={!isCollapsed ? { width: `${width}px` } : {}}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="absolute right-0 top-4 -mr-4 z-10">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full shadow-md bg-background"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {!isCollapsed && (
        <>
          <div 
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors"
            onMouseDown={startResizing}
          />
          <div className="flex-1 overflow-hidden flex flex-col">
            {children}
          </div>
        </>
      )}
      
      {isCollapsed && isHovering && (
        <div className="absolute left-full top-0 bottom-0 w-64 bg-background shadow-lg rounded-r-lg border border-l-0 border-border p-4">
          <div className="h-full overflow-y-auto">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
