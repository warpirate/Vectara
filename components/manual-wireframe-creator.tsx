"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import {
  X,
  Plus,
  Smartphone,
  Monitor,
  Tablet,
  Copy,
  Trash2,
  Undo,
  Redo,
  Grid,
  Move,
  MousePointer,
  Square,
  Type,
  ImageIcon,
  CreditCard,
  User,
  Mail,
  Search,
  Star,
  Heart,
  ChevronDown,
  ChevronRight,
  Layers,
  Settings,
  LayoutIcon,
  MenuIcon,
  Palette,
  Maximize,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react"
import type { WireframeData, WireframeComponent } from "@/lib/agents/layout-generator-agent"

interface ManualWireframeCreatorProps {
  onWireframeCreated: (wireframe: WireframeData) => void
  onCancel: () => void
}

const componentCategories = {
  Layout: [
    { type: "header", content: "Header", width: 100, height: 12, icon: LayoutIcon },
    { type: "navigation", content: "Navigation", width: 100, height: 8, icon: MenuIcon },
    { type: "hero", content: "Hero Section", width: 100, height: 35, icon: Square },
    { type: "footer", content: "Footer", width: 100, height: 10, icon: LayoutIcon },
    { type: "sidebar", content: "Sidebar", width: 25, height: 60, icon: Layers },
    { type: "container", content: "Container", width: 80, height: 40, icon: Square },
  ],
  Content: [
    { type: "text", content: "Text Block", width: 60, height: 15, icon: Type },
    { type: "heading", content: "Heading", width: 50, height: 8, icon: Type },
    { type: "paragraph", content: "Paragraph", width: 70, height: 20, icon: Type },
    { type: "image", content: "Image", width: 40, height: 30, icon: ImageIcon },
    { type: "video", content: "Video Player", width: 60, height: 35, icon: Square },
    { type: "card", content: "Content Card", width: 30, height: 25, icon: CreditCard },
  ],
  Interactive: [
    { type: "button", content: "Button", width: 20, height: 8, icon: MousePointer },
    { type: "form", content: "Contact Form", width: 50, height: 45, icon: Mail },
    { type: "input", content: "Input Field", width: 40, height: 6, icon: Type },
    { type: "search", content: "Search Bar", width: 35, height: 6, icon: Search },
    { type: "dropdown", content: "Dropdown", width: 25, height: 6, icon: ChevronDown },
    { type: "checkbox", content: "Checkbox", width: 15, height: 4, icon: Square },
  ],
  Templates: [
    { type: "login-form", content: "Login Form", width: 40, height: 35, icon: User },
    { type: "pricing-card", content: "Pricing Card", width: 30, height: 40, icon: CreditCard },
    { type: "testimonial", content: "Testimonial", width: 50, height: 25, icon: Star },
    { type: "cta-section", content: "CTA Section", width: 80, height: 25, icon: Heart },
    { type: "feature-grid", content: "Feature Grid", width: 90, height: 50, icon: Grid },
    { type: "gallery", content: "Image Gallery", width: 80, height: 45, icon: ImageIcon },
  ],
}

const quickStartTemplates = [
  {
    name: "Landing Page",
    components: [
      { type: "header", content: "Header", x: 0, y: 0, width: 100, height: 12 },
      { type: "hero", content: "Hero Section", x: 0, y: 15, width: 100, height: 35 },
      { type: "feature-grid", content: "Features", x: 0, y: 55, width: 100, height: 30 },
      { type: "footer", content: "Footer", x: 0, y: 90, width: 100, height: 10 },
    ],
  },
  {
    name: "Dashboard",
    components: [
      { type: "header", content: "Dashboard Header", x: 0, y: 0, width: 100, height: 10 },
      { type: "sidebar", content: "Navigation", x: 0, y: 12, width: 20, height: 85 },
      { type: "card", content: "Stats Card", x: 25, y: 15, width: 22, height: 20 },
      { type: "card", content: "Chart", x: 50, y: 15, width: 45, height: 35 },
      { type: "card", content: "Recent Activity", x: 25, y: 40, width: 70, height: 25 },
    ],
  },
  {
    name: "E-commerce",
    components: [
      { type: "header", content: "Store Header", x: 0, y: 0, width: 100, height: 12 },
      { type: "search", content: "Product Search", x: 20, y: 20, width: 60, height: 6 },
      { type: "card", content: "Product", x: 10, y: 35, width: 25, height: 35 },
      { type: "card", content: "Product", x: 37.5, y: 35, width: 25, height: 35 },
      { type: "card", content: "Product", x: 65, y: 35, width: 25, height: 35 },
    ],
  },
]

export function ManualWireframeCreator({ onWireframeCreated, onCancel }: ManualWireframeCreatorProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [screenType, setScreenType] = useState<"mobile" | "desktop" | "tablet">("desktop")
  const [components, setComponents] = useState<WireframeComponent[]>([])
  const [selectedComponents, setSelectedComponents] = useState<string[]>([])
  const [draggedComponent, setDraggedComponent] = useState<string | null>(null)
  const [history, setHistory] = useState<WireframeComponent[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [showGrid, setShowGrid] = useState(true)
  const [expandedCategory, setExpandedCategory] = useState<string>("Layout")
  const [tool, setTool] = useState<"select" | "move">("select")
  const [showCustomization, setShowCustomization] = useState(false)
  const [selectedComponentForEdit, setSelectedComponentForEdit] = useState<string | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)

  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...components])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [components, history, historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setComponents([...history[historyIndex - 1]])
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setComponents([...history[historyIndex + 1]])
    }
  }, [history, historyIndex])

  const addComponent = useCallback(
    (template: any, position?: { x: number; y: number }) => {
      const newComponent: WireframeComponent = {
        id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: template.type || "text",
        content: template.content || "New Component",
        x: position?.x || 10,
        y: position?.y || findBestPosition(template.height || 20),
        width: template.width || 50,
        height: template.height || 20,
        styles: {
          backgroundColor: getComponentColor(template.type),
          borderColor: "#e2e8f0",
          textColor: "#1e293b",
          fontSize: "14px",
          fontWeight: template.type === "heading" ? "bold" : "normal",
          textAlign: "center",
          borderRadius: "6px",
          borderWidth: "1px",
          padding: "12px",
        },
      }

      setComponents((prev) => [...prev, newComponent])
      saveToHistory()
    },
    [components, saveToHistory],
  )

  const findBestPosition = (height: number) => {
    if (components.length === 0) return 10

    const sortedComponents = [...components].sort((a, b) => a.y - b.y)
    let bestY = 10

    for (const comp of sortedComponents) {
      if (bestY < comp.y + comp.height + 5) {
        bestY = comp.y + comp.height + 10
      }
    }

    return Math.min(bestY, 85)
  }

  const getComponentColor = (type: string) => {
    const colorMap: Record<string, string> = {
      header: "#f1f5f9",
      navigation: "#e2e8f0",
      hero: "#ddd6fe",
      button: "#3b82f6",
      form: "#f0f9ff",
      image: "#fef3c7",
      text: "#f8fafc",
      card: "#ffffff",
      footer: "#f1f5f9",
    }
    return colorMap[type] || "#f8fafc"
  }

  const loadTemplate = (template: any) => {
    const templateComponents = template.components.map((comp: any, index: number) => ({
      id: `template-${Date.now()}-${index}`,
      type: comp.type,
      content: comp.content,
      x: comp.x,
      y: comp.y,
      width: comp.width,
      height: comp.height,
      styles: {
        backgroundColor: getComponentColor(comp.type),
        borderColor: "#e2e8f0",
        textColor: "#1e293b",
        fontSize: "14px",
        fontWeight: comp.type === "heading" ? "bold" : "normal",
        textAlign: "center",
        borderRadius: "6px",
        borderWidth: "1px",
        padding: "12px",
      },
    }))

    setComponents(templateComponents)
    setTitle(template.name)
    saveToHistory()
  }

  const handleMouseDown = (e: React.MouseEvent, componentId: string) => {
    if (tool !== "move") return

    e.preventDefault()
    setDraggedComponent(componentId)
    setIsDragging(true)

    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !draggedComponent || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      // Snap to grid if enabled
      const snappedX = showGrid ? Math.round(x / 5) * 5 : x
      const snappedY = showGrid ? Math.round(y / 5) * 5 : y

      setComponents((prev) =>
        prev.map((comp) =>
          comp.id === draggedComponent
            ? { ...comp, x: Math.max(0, Math.min(95, snappedX)), y: Math.max(0, Math.min(95, snappedY)) }
            : comp,
        ),
      )
    },
    [isDragging, draggedComponent, showGrid],
  )

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      setDraggedComponent(null)
      saveToHistory()
    }
  }, [isDragging, saveToHistory])

  const updateComponentStyle = (componentId: string, styleUpdates: Partial<WireframeComponent["styles"]>) => {
    setComponents((prev) =>
      prev.map((comp) => (comp.id === componentId ? { ...comp, styles: { ...comp.styles, ...styleUpdates } } : comp)),
    )
    saveToHistory()
  }

  const updateComponentDimensions = (
    componentId: string,
    updates: { width?: number; height?: number; x?: number; y?: number },
  ) => {
    setComponents((prev) => prev.map((comp) => (comp.id === componentId ? { ...comp, ...updates } : comp)))
    saveToHistory()
  }

  const updateComponentContent = (componentId: string, content: string) => {
    setComponents((prev) => prev.map((comp) => (comp.id === componentId ? { ...comp, content } : comp)))
    saveToHistory()
  }

  const selectComponent = (componentId: string) => {
    setSelectedComponents([componentId])
    setSelectedComponentForEdit(componentId)
    setShowCustomization(true)
  }

  const handleResizeStart = (e: React.MouseEvent, componentId: string, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    setDraggedComponent(componentId)
  }

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !draggedComponent || !canvasRef.current || !resizeHandle) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      const component = components.find((c) => c.id === draggedComponent)
      if (!component) return

      let updates: any = {}

      switch (resizeHandle) {
        case "se": // Southeast
          updates = {
            width: Math.max(5, x - component.x),
            height: Math.max(3, y - component.y),
          }
          break
        case "sw": // Southwest
          updates = {
            x: Math.max(0, x),
            width: Math.max(5, component.x + component.width - x),
            height: Math.max(3, y - component.y),
          }
          break
        case "ne": // Northeast
          updates = {
            width: Math.max(5, x - component.x),
            y: Math.max(0, y),
            height: Math.max(3, component.y + component.height - y),
          }
          break
        case "nw": // Northwest
          updates = {
            x: Math.max(0, x),
            y: Math.max(0, y),
            width: Math.max(5, component.x + component.width - x),
            height: Math.max(3, component.y + component.height - y),
          }
          break
      }

      updateComponentDimensions(draggedComponent, updates)
    },
    [isResizing, draggedComponent, resizeHandle, components],
  )

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
    setResizeHandle(null)
    setDraggedComponent(null)
  }, [])

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", isDragging ? handleMouseMove : handleResizeMove)
      document.addEventListener("mouseup", isDragging ? handleMouseUp : handleResizeEnd)
      return () => {
        document.removeEventListener("mousemove", isDragging ? handleMouseMove : handleResizeMove)
        document.removeEventListener("mouseup", isDragging ? handleMouseUp : handleResizeEnd)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleResizeMove, handleMouseUp, handleResizeEnd])

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
          case "c":
            if (selectedComponents.length > 0) {
              e.preventDefault()
              // Copy functionality could be added here
            }
            break
          case "Delete":
          case "Backspace":
            if (selectedComponents.length > 0) {
              e.preventDefault()
              removeComponents(selectedComponents)
            }
            break
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [selectedComponents, undo, redo])

  const removeComponents = (ids: string[]) => {
    setComponents((prev) => prev.filter((comp) => !ids.includes(comp.id)))
    setSelectedComponents([])
    saveToHistory()
  }

  const duplicateComponent = (id: string) => {
    const component = components.find((comp) => comp.id === id)
    if (component) {
      const newComponent = {
        ...component,
        id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: Math.min(component.x + 5, 90),
        y: Math.min(component.y + 5, 90),
      }
      setComponents((prev) => [...prev, newComponent])
      saveToHistory()
    }
  }

  const createWireframe = () => {
    if (!title.trim()) {
      alert("Please enter a title for your wireframe")
      return
    }

    const wireframeData: WireframeData = {
      wireframe: {
        id: `wireframe-${Date.now()}`,
        title: title.trim(),
        description: description.trim() || "Manually created wireframe",
        components,
        metadata: {
          screenType,
          responsive: true,
          accessibility: true,
          createdAt: new Date().toISOString(),
          version: "1.0",
        },
      },
      generationMetadata: {
        model: "manual",
        timestamp: new Date().toISOString(),
        processingTime: 0,
        tokensUsed: 0,
        confidence: 1.0,
        agents: ["manual-creator"],
      },
    }

    onWireframeCreated(wireframeData)
  }

  const getScreenIcon = () => {
    switch (screenType) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />
      case "tablet":
        return <Tablet className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const getSelectedComponent = () => {
    return selectedComponentForEdit ? components.find((c) => c.id === selectedComponentForEdit) : null
  }

  return (
    <div className="h-full flex bg-background">
      {/* Enhanced Component Library */}
      <div className="w-80 border-r bg-muted/10 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Wireframe Builder</h2>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tool Selection */}
          <div className="flex gap-1 mb-4">
            <Button
              variant={tool === "select" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("select")}
              className="flex-1"
            >
              <MousePointer className="h-3 w-3 mr-1" />
              Select
            </Button>
            <Button
              variant={tool === "move" ? "default" : "outline"}
              size="sm"
              onClick={() => setTool("move")}
              className="flex-1"
            >
              <Move className="h-3 w-3 mr-1" />
              Move
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-1 mb-4">
            <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)">
              <Undo className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowGrid(!showGrid)} title="Toggle Grid">
              <Grid className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Start Templates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Start</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickStartTemplates.map((template, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start bg-transparent"
                  onClick={() => loadTemplate(template)}
                >
                  <LayoutIcon className="mr-2 h-3 w-3" />
                  {template.name}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Component Categories */}
          {Object.entries(componentCategories).map(([category, templates]) => (
            <Card key={category}>
              <CardHeader
                className="pb-2 cursor-pointer"
                onClick={() => setExpandedCategory(expandedCategory === category ? "" : category)}
              >
                <CardTitle className="text-sm flex items-center justify-between">
                  {category}
                  {expandedCategory === category ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </CardTitle>
              </CardHeader>
              {expandedCategory === category && (
                <CardContent className="space-y-1">
                  {templates.map((template, index) => {
                    const IconComponent = template.icon
                    return (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8"
                        onClick={() => addComponent(template)}
                      >
                        <IconComponent className="mr-2 h-3 w-3" />
                        {template.content}
                      </Button>
                    )
                  })}
                </CardContent>
              )}
            </Card>
          ))}

          {/* Settings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <Settings className="mr-2 h-3 w-3" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Wireframe" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your wireframe..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Screen Type</Label>
                <Select value={screenType} onValueChange={(value: any) => setScreenType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Desktop
                      </div>
                    </SelectItem>
                    <SelectItem value="tablet">
                      <div className="flex items-center gap-2">
                        <Tablet className="h-4 w-4" />
                        Tablet
                      </div>
                    </SelectItem>
                    <SelectItem value="mobile">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Mobile
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getScreenIcon()}
                  <span>{components.length} components</span>
                </div>
                <Button onClick={createWireframe} className="w-full" disabled={!title.trim()}>
                  Create Wireframe
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced Canvas */}
      <div className="flex-1 flex flex-col bg-muted/5">
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Canvas</h2>
              <p className="text-sm text-muted-foreground">
                {tool === "move" ? "Click and drag to move components" : "Click to select components"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                {getScreenIcon()}
                {screenType}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomization(!showCustomization)}
                className={showCustomization ? "bg-primary text-primary-foreground" : ""}
              >
                <Palette className="h-3 w-3 mr-1" />
                Customize
              </Button>
              {selectedComponents.length > 0 && (
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => selectedComponents.forEach(duplicateComponent)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => removeComponents(selectedComponents)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-5xl mx-auto">
              <div
                ref={canvasRef}
                className={`bg-white border-2 border-dashed border-muted-foreground/20 rounded-lg min-h-[700px] relative overflow-hidden ${
                  showGrid ? "bg-grid-pattern" : ""
                }`}
                style={{
                  backgroundImage: showGrid ? "radial-gradient(circle, #e2e8f0 1px, transparent 1px)" : "none",
                  backgroundSize: showGrid ? "20px 20px" : "none",
                }}
              >
                {components.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Plus className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <h3 className="text-lg font-medium mb-2">Start Building</h3>
                      <p className="text-sm">Add components from the library or use a quick start template</p>
                    </div>
                  </div>
                ) : (
                  components.map((component) => (
                    <div
                      key={component.id}
                      className={`absolute border rounded-md flex items-center justify-center text-xs font-medium transition-all duration-200 cursor-pointer group ${
                        selectedComponents.includes(component.id)
                          ? "border-primary border-2 shadow-lg"
                          : "border-muted-foreground/30 hover:border-primary/50"
                      } ${tool === "move" ? "cursor-move" : "cursor-pointer"}`}
                      style={{
                        left: `${component.x}%`,
                        top: `${component.y}%`,
                        width: `${component.width}%`,
                        height: `${component.height}%`,
                        backgroundColor: component.styles?.backgroundColor || "#f8fafc",
                        color: component.styles?.textColor || "#1e293b",
                        fontSize: component.styles?.fontSize || "14px",
                        fontWeight: component.styles?.fontWeight || "normal",
                        textAlign: (component.styles?.textAlign as any) || "center",
                        borderRadius: component.styles?.borderRadius || "6px",
                        borderWidth: component.styles?.borderWidth || "1px",
                        borderColor: component.styles?.borderColor || "#e2e8f0",
                        padding: component.styles?.padding || "12px",
                      }}
                      onMouseDown={(e) => handleMouseDown(e, component.id)}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (tool === "select") {
                          selectComponent(component.id)
                        }
                      }}
                    >
                      <span className="text-center px-2 select-none overflow-hidden">{component.content}</span>

                      {selectedComponents.includes(component.id) && (
                        <>
                          {/* Resize handles */}
                          <div
                            className="absolute -top-1 -left-1 w-2 h-2 bg-primary border border-white rounded-full cursor-nw-resize"
                            onMouseDown={(e) => handleResizeStart(e, component.id, "nw")}
                          />
                          <div
                            className="absolute -top-1 -right-1 w-2 h-2 bg-primary border border-white rounded-full cursor-ne-resize"
                            onMouseDown={(e) => handleResizeStart(e, component.id, "ne")}
                          />
                          <div
                            className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary border border-white rounded-full cursor-sw-resize"
                            onMouseDown={(e) => handleResizeStart(e, component.id, "sw")}
                          />
                          <div
                            className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary border border-white rounded-full cursor-se-resize"
                            onMouseDown={(e) => handleResizeStart(e, component.id, "se")}
                          />
                        </>
                      )}

                      {/* Component actions */}
                      <div className="absolute -top-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            duplicateComponent(component.id)
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeComponents([component.id])
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {showCustomization && (
            <div className="w-80 border-l bg-background flex flex-col">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Customize Component</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowCustomization(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {getSelectedComponent() ? (
                  <>
                    {/* Content */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Content</Label>
                      <Input
                        value={getSelectedComponent()?.content || ""}
                        onChange={(e) => updateComponentContent(selectedComponentForEdit!, e.target.value)}
                        placeholder="Component text"
                      />
                    </div>

                    {/* Dimensions */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Maximize className="h-3 w-3" />
                        Dimensions
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Width (%)</Label>
                          <Slider
                            value={[getSelectedComponent()?.width || 50]}
                            onValueChange={([value]) =>
                              updateComponentDimensions(selectedComponentForEdit!, { width: value })
                            }
                            min={5}
                            max={100}
                            step={1}
                            className="mt-1"
                          />
                          <span className="text-xs text-muted-foreground">{getSelectedComponent()?.width}%</span>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Height (%)</Label>
                          <Slider
                            value={[getSelectedComponent()?.height || 20]}
                            onValueChange={([value]) =>
                              updateComponentDimensions(selectedComponentForEdit!, { height: value })
                            }
                            min={3}
                            max={80}
                            step={1}
                            className="mt-1"
                          />
                          <span className="text-xs text-muted-foreground">{getSelectedComponent()?.height}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Position */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Position</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">X (%)</Label>
                          <Slider
                            value={[getSelectedComponent()?.x || 0]}
                            onValueChange={([value]) =>
                              updateComponentDimensions(selectedComponentForEdit!, { x: value })
                            }
                            min={0}
                            max={95}
                            step={1}
                            className="mt-1"
                          />
                          <span className="text-xs text-muted-foreground">{getSelectedComponent()?.x}%</span>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Y (%)</Label>
                          <Slider
                            value={[getSelectedComponent()?.y || 0]}
                            onValueChange={([value]) =>
                              updateComponentDimensions(selectedComponentForEdit!, { y: value })
                            }
                            min={0}
                            max={95}
                            step={1}
                            className="mt-1"
                          />
                          <span className="text-xs text-muted-foreground">{getSelectedComponent()?.y}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Palette className="h-3 w-3" />
                        Colors
                      </Label>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Background</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="color"
                              value={getSelectedComponent()?.styles?.backgroundColor || "#f8fafc"}
                              onChange={(e) =>
                                updateComponentStyle(selectedComponentForEdit!, { backgroundColor: e.target.value })
                              }
                              className="w-12 h-8 p-1 border rounded"
                            />
                            <Input
                              value={getSelectedComponent()?.styles?.backgroundColor || "#f8fafc"}
                              onChange={(e) =>
                                updateComponentStyle(selectedComponentForEdit!, { backgroundColor: e.target.value })
                              }
                              placeholder="#f8fafc"
                              className="flex-1 text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Text Color</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="color"
                              value={getSelectedComponent()?.styles?.textColor || "#1e293b"}
                              onChange={(e) =>
                                updateComponentStyle(selectedComponentForEdit!, { textColor: e.target.value })
                              }
                              className="w-12 h-8 p-1 border rounded"
                            />
                            <Input
                              value={getSelectedComponent()?.styles?.textColor || "#1e293b"}
                              onChange={(e) =>
                                updateComponentStyle(selectedComponentForEdit!, { textColor: e.target.value })
                              }
                              placeholder="#1e293b"
                              className="flex-1 text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Border Color</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="color"
                              value={getSelectedComponent()?.styles?.borderColor || "#e2e8f0"}
                              onChange={(e) =>
                                updateComponentStyle(selectedComponentForEdit!, { borderColor: e.target.value })
                              }
                              className="w-12 h-8 p-1 border rounded"
                            />
                            <Input
                              value={getSelectedComponent()?.styles?.borderColor || "#e2e8f0"}
                              onChange={(e) =>
                                updateComponentStyle(selectedComponentForEdit!, { borderColor: e.target.value })
                              }
                              placeholder="#e2e8f0"
                              className="flex-1 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Typography */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Type className="h-3 w-3" />
                        Typography
                      </Label>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Font Size</Label>
                          <Select
                            value={getSelectedComponent()?.styles?.fontSize || "14px"}
                            onValueChange={(value) =>
                              updateComponentStyle(selectedComponentForEdit!, { fontSize: value })
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10px">10px</SelectItem>
                              <SelectItem value="12px">12px</SelectItem>
                              <SelectItem value="14px">14px</SelectItem>
                              <SelectItem value="16px">16px</SelectItem>
                              <SelectItem value="18px">18px</SelectItem>
                              <SelectItem value="20px">20px</SelectItem>
                              <SelectItem value="24px">24px</SelectItem>
                              <SelectItem value="32px">32px</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Font Weight</Label>
                          <Select
                            value={getSelectedComponent()?.styles?.fontWeight || "normal"}
                            onValueChange={(value) =>
                              updateComponentStyle(selectedComponentForEdit!, { fontWeight: value })
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="bold">Bold</SelectItem>
                              <SelectItem value="lighter">Light</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Text Align</Label>
                          <div className="flex gap-1 mt-1">
                            <Button
                              variant={getSelectedComponent()?.styles?.textAlign === "left" ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateComponentStyle(selectedComponentForEdit!, { textAlign: "left" })}
                            >
                              <AlignLeft className="h-3 w-3" />
                            </Button>
                            <Button
                              variant={getSelectedComponent()?.styles?.textAlign === "center" ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateComponentStyle(selectedComponentForEdit!, { textAlign: "center" })}
                            >
                              <AlignCenter className="h-3 w-3" />
                            </Button>
                            <Button
                              variant={getSelectedComponent()?.styles?.textAlign === "right" ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateComponentStyle(selectedComponentForEdit!, { textAlign: "right" })}
                            >
                              <AlignRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Border & Spacing */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Border & Spacing</Label>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Border Radius</Label>
                          <Slider
                            value={[
                              Number.parseInt(getSelectedComponent()?.styles?.borderRadius?.replace("px", "") || "6"),
                            ]}
                            onValueChange={([value]) =>
                              updateComponentStyle(selectedComponentForEdit!, { borderRadius: `${value}px` })
                            }
                            min={0}
                            max={20}
                            step={1}
                            className="mt-1"
                          />
                          <span className="text-xs text-muted-foreground">
                            {getSelectedComponent()?.styles?.borderRadius}
                          </span>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Border Width</Label>
                          <Slider
                            value={[
                              Number.parseInt(getSelectedComponent()?.styles?.borderWidth?.replace("px", "") || "1"),
                            ]}
                            onValueChange={([value]) =>
                              updateComponentStyle(selectedComponentForEdit!, { borderWidth: `${value}px` })
                            }
                            min={0}
                            max={5}
                            step={1}
                            className="mt-1"
                          />
                          <span className="text-xs text-muted-foreground">
                            {getSelectedComponent()?.styles?.borderWidth}
                          </span>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Padding</Label>
                          <Slider
                            value={[
                              Number.parseInt(getSelectedComponent()?.styles?.padding?.replace("px", "") || "12"),
                            ]}
                            onValueChange={([value]) =>
                              updateComponentStyle(selectedComponentForEdit!, { padding: `${value}px` })
                            }
                            min={0}
                            max={40}
                            step={2}
                            className="mt-1"
                          />
                          <span className="text-xs text-muted-foreground">
                            {getSelectedComponent()?.styles?.padding}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">Select a component to customize its properties</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
