"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { EditDialog } from "./edit-dialog"
import {
  Wand2,
  Square,
  Type,
  MousePointer,
  ImageIcon,
  List,
  CreditCard,
  Navigation,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Undo,
  Redo,
} from "lucide-react"
import type { LayoutOutput, WireframeComponent } from "@/lib/agents/layout-generator-agent"

interface WireframeCanvasProps {
  wireframe: LayoutOutput | null
  onEditComponent: (id: string, editPrompt: string, options: any) => void
  onUpdateWireframe: (wireframe: LayoutOutput) => void
  isEditing: boolean
}

interface CanvasState {
  zoom: number
  pan: { x: number; y: number }
  selectedComponents: string[]
  showGrid: boolean
  snapToGrid: boolean
}

const COMPONENT_PALETTE = [
  { type: "container", icon: Square, label: "Container" },
  { type: "text", icon: Type, label: "Text" },
  { type: "button", icon: MousePointer, label: "Button" },
  { type: "input", icon: Square, label: "Input" },
  { type: "image", icon: ImageIcon, label: "Image" },
  { type: "list", icon: List, label: "List" },
  { type: "card", icon: CreditCard, label: "Card" },
  { type: "navigation", icon: Navigation, label: "Navigation" },
]

export function WireframeCanvas({ wireframe, onEditComponent, onUpdateWireframe, isEditing }: WireframeCanvasProps) {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    selectedComponents: [],
    showGrid: true,
    snapToGrid: true,
  })

  const [draggedComponent, setDraggedComponent] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [history, setHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const canvasRef = useRef<HTMLDivElement>(null)

  // Save to history
  const saveToHistory = useCallback(
    (newWireframe: any) => {
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(JSON.parse(JSON.stringify(newWireframe)))
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    },
    [history, historyIndex],
  )

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      onUpdateWireframe(history[historyIndex - 1])
    }
  }, [historyIndex, history, onUpdateWireframe])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      onUpdateWireframe(history[historyIndex + 1])
    }
  }, [historyIndex, history, onUpdateWireframe])

  // Component manipulation
  const selectComponent = useCallback((id: string, multiSelect = false) => {
    setCanvasState((prev) => ({
      ...prev,
      selectedComponents: multiSelect
        ? prev.selectedComponents.includes(id)
          ? prev.selectedComponents.filter((cid) => cid !== id)
          : [...prev.selectedComponents, id]
        : [id],
    }))
  }, [])

  const deleteSelectedComponents = useCallback(() => {
    if (!wireframe || canvasState.selectedComponents.length === 0) return

    const deleteFromComponents = (components: WireframeComponent[]): WireframeComponent[] => {
      return components
        .filter((comp) => !canvasState.selectedComponents.includes(comp.id))
        .map((comp) => ({
          ...comp,
          children: comp.children ? deleteFromComponents(comp.children) : undefined,
        }))
    }

    const updatedWireframe = {
      ...wireframe,
      wireframe: {
        ...wireframe.wireframe,
        components: deleteFromComponents(wireframe.wireframe.components),
      }
    }

    saveToHistory(updatedWireframe)
    onUpdateWireframe(updatedWireframe)
    setCanvasState((prev) => ({ ...prev, selectedComponents: [] }))
  }, [wireframe, canvasState.selectedComponents, saveToHistory, onUpdateWireframe])

  const addComponent = useCallback(
    (type: string, parentId?: string) => {
      if (!wireframe) return

      const components = wireframe?.wireframe?.components || []

      const newComponent: WireframeComponent = {
        id: `${type}-${Date.now()}`,
        type: type as any,
        props: {
          text: type === "text" ? "New Text" : type === "button" ? "New Button" : undefined,
          placeholder: type === "input" ? "Enter text..." : undefined,
          position: { x: 50, y: 50 },
          dimensions: { width: 200, height: type === "input" ? 40 : type === "button" ? 36 : 100 },
        },
      }

      const addToComponents = (components: WireframeComponent[]): WireframeComponent[] => {
        if (!parentId) {
          return [...components, newComponent]
        }

        return components.map((comp) => {
          if (comp.id === parentId) {
            return {
              ...comp,
              children: [...(comp.children || []), newComponent],
            }
          }
          return comp.children
            ? {
                ...comp,
                children: addToComponents(comp.children),
              }
            : comp
        })
      }

      const updatedWireframe = {
        ...wireframe,
        wireframe: {
          ...wireframe.wireframe,
          components: addToComponents(components),
        }
      }

      saveToHistory(updatedWireframe)
      onUpdateWireframe(updatedWireframe)
    },
    [wireframe, saveToHistory, onUpdateWireframe],
  )

  // Canvas controls
  const zoomIn = () => setCanvasState((prev) => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 3) }))
  const zoomOut = () => setCanvasState((prev) => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.3) }))
  const resetZoom = () => setCanvasState((prev) => ({ ...prev, zoom: 1, pan: { x: 0, y: 0 } }))
  const toggleGrid = () => setCanvasState((prev) => ({ ...prev, showGrid: !prev.showGrid }))

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "z":
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
            break
          case "Delete":
          case "Backspace":
            e.preventDefault()
            deleteSelectedComponents()
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [undo, redo, deleteSelectedComponents])

  if (!wireframe) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <div className="text-center">
          <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Generate a wireframe to start editing</p>
        </div>
      </div>
    )
  }

  const metadata = wireframe?.wireframe?.metadata || { screenType: 'desktop', responsive: true, accessibility: false }
  const title = wireframe?.wireframe?.title || 'Untitled Wireframe'
  const description = wireframe?.wireframe?.description || 'No description available'

  return (
    <div className="flex h-full">
      {/* Component Palette */}
      <div className="w-64 border-r bg-muted/20 p-4 space-y-4">
        <div>
          <h3 className="font-semibold mb-3">Components</h3>
          <div className="grid grid-cols-2 gap-2">
            {COMPONENT_PALETTE.map(({ type, icon: Icon, label }) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                className="h-16 flex-col gap-1 bg-transparent"
                onClick={() => addComponent(type)}
                disabled={isEditing}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Properties Panel */}
        {canvasState.selectedComponents.length === 1 && (
          <div>
            <h3 className="font-semibold mb-3">Properties</h3>
            <ComponentPropertiesPanel
              componentId={canvasState.selectedComponents[0]}
              wireframe={wireframe}
              onUpdateWireframe={onUpdateWireframe}
              saveToHistory={saveToHistory}
            />
          </div>
        )}
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Canvas Toolbar */}
        <div className="border-b p-2 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={undo} disabled={historyIndex <= 0}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={redo} disabled={historyIndex >= history.length - 1}>
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={resetZoom}>
              {Math.round(canvasState.zoom * 100)}%
            </Button>
            <Button size="sm" variant="outline" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Button size="sm" variant={canvasState.showGrid ? "default" : "outline"} onClick={toggleGrid}>
            <Grid3X3 className="h-4 w-4" />
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline">{metadata.screenType || "Desktop"}</Badge>
            <span className="text-sm text-muted-foreground">{canvasState.selectedComponents.length} selected</span>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-hidden relative bg-background"
          style={{
            backgroundImage: canvasState.showGrid ? `radial-gradient(circle, #e5e7eb 1px, transparent 1px)` : undefined,
            backgroundSize: canvasState.showGrid ? "20px 20px" : undefined,
          }}
        >
          <div
            className="absolute inset-0 origin-top-left transition-transform"
            style={{
              transform: `scale(${canvasState.zoom}) translate(${canvasState.pan.x}px, ${canvasState.pan.y}px)`,
            }}
          >
            <div className="p-8">
              <WireframeRenderer
                components={wireframe?.wireframe?.components || []}
                selectedComponents={canvasState.selectedComponents}
                onSelectComponent={selectComponent}
                onEditComponent={onEditComponent}
                isEditing={isEditing}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Component Properties Panel
function ComponentPropertiesPanel({
  componentId,
  wireframe,
  onUpdateWireframe,
  saveToHistory,
}: {
  componentId: string
  wireframe: any
  onUpdateWireframe: (wireframe: any) => void
  saveToHistory: (wireframe: any) => void
}) {
  const findComponent = (components: WireframeComponent[], id: string): WireframeComponent | null => {
    for (const comp of components) {
      if (comp.id === id) return comp
      if (comp.children) {
        const found = findComponent(comp.children, id)
        if (found) return found
      }
    }
    return null
  }

  const component = findComponent(wireframe.components, componentId)
  if (!component) return null

  const updateComponent = (updates: Partial<WireframeComponent>) => {
    const updateInComponents = (components: WireframeComponent[]): WireframeComponent[] => {
      return components.map((comp) => {
        if (comp.id === componentId) {
          return { ...comp, ...updates }
        }
        return comp.children
          ? {
              ...comp,
              children: updateInComponents(comp.children),
            }
          : comp
      })
    }

    const updatedWireframe = {
      ...wireframe,
      components: updateInComponents(wireframe.components),
    }

    saveToHistory(updatedWireframe)
    onUpdateWireframe(updatedWireframe)
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Component Type</Label>
        <Badge variant="secondary" className="mt-1">
          {component.type}
        </Badge>
      </div>

      {component.props.text !== undefined && (
        <div>
          <Label htmlFor="text" className="text-xs">
            Text
          </Label>
          <Input
            id="text"
            value={component.props.text || ""}
            onChange={(e) =>
              updateComponent({
                props: { ...component.props, text: e.target.value },
              })
            }
            className="mt-1"
          />
        </div>
      )}

      {component.props.placeholder !== undefined && (
        <div>
          <Label htmlFor="placeholder" className="text-xs">
            Placeholder
          </Label>
          <Input
            id="placeholder"
            value={component.props.placeholder || ""}
            onChange={(e) =>
              updateComponent({
                props: { ...component.props, placeholder: e.target.value },
              })
            }
            className="mt-1"
          />
        </div>
      )}

      {component.props.dimensions && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="width" className="text-xs">
              Width
            </Label>
            <Input
              id="width"
              type="number"
              value={component.props.dimensions.width}
              onChange={(e) =>
                updateComponent({
                  props: {
                    ...component.props,
                    dimensions: {
                      ...component.props.dimensions!,
                      width: Number.parseInt(e.target.value) || 0,
                    },
                  },
                })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="height" className="text-xs">
              Height
            </Label>
            <Input
              id="height"
              type="number"
              value={component.props.dimensions.height}
              onChange={(e) =>
                updateComponent({
                  props: {
                    ...component.props,
                    dimensions: {
                      ...component.props.dimensions!,
                      height: Number.parseInt(e.target.value) || 0,
                    },
                  },
                })
              }
              className="mt-1"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Enhanced Wireframe Renderer
function WireframeRenderer({
  components,
  selectedComponents,
  onSelectComponent,
  onEditComponent,
  isEditing,
}: {
  components: WireframeComponent[]
  selectedComponents: string[]
  onSelectComponent: (id: string, multiSelect?: boolean) => void
  onEditComponent: (id: string, editPrompt: string, options: any) => void
  isEditing: boolean
}) {
  const handleEditComponent = async (componentId: string, editPrompt: string, options: any) => {
    await onEditComponent(componentId, editPrompt, options)
  }

  const renderComponent = (component: WireframeComponent) => {
    const isSelected = selectedComponents.includes(component.id)

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelectComponent(component.id, e.ctrlKey || e.metaKey)
    }

    const baseClasses = `
      relative border-2 transition-all cursor-pointer group
      ${isSelected ? "border-primary bg-primary/5" : "border-dashed border-muted hover:border-primary/50"}
    `

    const style = {
      width: component.props?.dimensions?.width || "auto",
      height: component.props?.dimensions?.height || "auto",
      ...component.style,
    }

    switch (component.type) {
      case "container":
        return (
          <div key={component.id} className={`${baseClasses} p-4 min-h-[100px]`} style={style} onClick={handleClick}>
            {isSelected && (
              <div className="absolute -top-6 left-0 bg-primary text-primary-foreground px-2 py-1 text-xs rounded">
                Container
              </div>
            )}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditDialog
                componentId={component.id}
                componentType="container"
                onEdit={(editPrompt, options) => handleEditComponent(component.id, editPrompt, options)}
                isEditing={isEditing}
              />
            </div>
            <div className="space-y-2">{component.children?.map(renderComponent)}</div>
          </div>
        )

      case "text":
        return (
          <div key={component.id} className={`${baseClasses} p-2`} style={style} onClick={handleClick}>
            {isSelected && (
              <div className="absolute -top-6 left-0 bg-primary text-primary-foreground px-2 py-1 text-xs rounded">
                Text
              </div>
            )}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditDialog
                componentId={component.id}
                componentType="text"
                onEdit={(editPrompt, options) => handleEditComponent(component.id, editPrompt, options)}
                isEditing={isEditing}
              />
            </div>
            <p className={`${component.props.size === "lg" ? "text-lg font-semibold" : "text-sm"}`}>
              {component.props.text || "Text Element"}
            </p>
          </div>
        )

      case "button":
        return (
          <div key={component.id} className={`${baseClasses} p-2 inline-block`} style={style} onClick={handleClick}>
            {isSelected && (
              <div className="absolute -top-6 left-0 bg-primary text-primary-foreground px-2 py-1 text-xs rounded">
                Button
              </div>
            )}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditDialog
                componentId={component.id}
                componentType="button"
                onEdit={(editPrompt, options) => handleEditComponent(component.id, editPrompt, options)}
                isEditing={isEditing}
              />
            </div>
            <Button
              variant={component.props.variant === "primary" ? "default" : "outline"}
              size={component.props.size === "md" ? "default" : component.props.size || "default"}
              disabled
            >
              {component.props.text || "Button"}
            </Button>
          </div>
        )

      case "input":
        return (
          <div key={component.id} className={`${baseClasses} p-2`} style={style} onClick={handleClick}>
            {isSelected && (
              <div className="absolute -top-6 left-0 bg-primary text-primary-foreground px-2 py-1 text-xs rounded">
                Input
              </div>
            )}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditDialog
                componentId={component.id}
                componentType="input"
                onEdit={(editPrompt, options) => handleEditComponent(component.id, editPrompt, options)}
                isEditing={isEditing}
              />
            </div>
            <Input placeholder={component.props.placeholder || "Input field"} disabled />
          </div>
        )

      case "image":
        return (
          <div key={component.id} className={`${baseClasses} p-2`} style={style} onClick={handleClick}>
            {isSelected && (
              <div className="absolute -top-6 left-0 bg-primary text-primary-foreground px-2 py-1 text-xs rounded">
                Image
              </div>
            )}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditDialog
                componentId={component.id}
                componentType="image"
                onEdit={(editPrompt, options) => handleEditComponent(component.id, editPrompt, options)}
                isEditing={isEditing}
              />
            </div>
            <ImageIcon className="w-full h-full" />
          </div>
        )

      case "list":
        return (
          <div key={component.id} className={`${baseClasses} p-2`} style={style} onClick={handleClick}>
            {isSelected && (
              <div className="absolute -top-6 left-0 bg-primary text-primary-foreground px-2 py-1 text-xs rounded">
                List
              </div>
            )}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditDialog
                componentId={component.id}
                componentType="list"
                onEdit={(editPrompt, options) => handleEditComponent(component.id, editPrompt, options)}
                isEditing={isEditing}
              />
            </div>
            <span className="text-muted-foreground text-sm">List component</span>
          </div>
        )

      case "card":
        return (
          <div key={component.id} className={`${baseClasses} p-2`} style={style} onClick={handleClick}>
            {isSelected && (
              <div className="absolute -top-6 left-0 bg-primary text-primary-foreground px-2 py-1 text-xs rounded">
                Card
              </div>
            )}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditDialog
                componentId={component.id}
                componentType="card"
                onEdit={(editPrompt, options) => handleEditComponent(component.id, editPrompt, options)}
                isEditing={isEditing}
              />
            </div>
            <span className="text-muted-foreground text-sm">Card component</span>
          </div>
        )

      case "navigation":
        return (
          <div key={component.id} className={`${baseClasses} p-2`} style={style} onClick={handleClick}>
            {isSelected && (
              <div className="absolute -top-6 left-0 bg-primary text-primary-foreground px-2 py-1 text-xs rounded">
                Navigation
              </div>
            )}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditDialog
                componentId={component.id}
                componentType="navigation"
                onEdit={(editPrompt, options) => handleEditComponent(component.id, editPrompt, options)}
                isEditing={isEditing}
              />
            </div>
            <span className="text-muted-foreground text-sm">Navigation component</span>
          </div>
        )

      default:
        return (
          <div
            key={component.id}
            className={`${baseClasses} p-4 min-h-[50px] flex items-center justify-center`}
            style={style}
            onClick={handleClick}
          >
            {isSelected && (
              <div className="absolute -top-6 left-0 bg-primary text-primary-foreground px-2 py-1 text-xs rounded">
                {component.type}
              </div>
            )}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <EditDialog
                componentId={component.id}
                componentType={component.type}
                onEdit={(editPrompt, options) => handleEditComponent(component.id, editPrompt, options)}
                isEditing={isEditing}
              />
            </div>
            <span className="text-muted-foreground text-sm">{component.type} component</span>
          </div>
        )
    }
  }

  return <div className="space-y-4">{components.map(renderComponent)}</div>
}
