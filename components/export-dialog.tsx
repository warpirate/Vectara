"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Download, Code, Zap } from "lucide-react"

interface ExportDialogProps {
  wireframe: any
  onExport: (options: any) => Promise<void>
  isExporting: boolean
}

export function ExportDialog({ wireframe, onExport, isExporting }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState("react-tsx")
  const [framework, setFramework] = useState("nextjs")
  const [styling, setStyling] = useState("tailwind")
  const [includeTests, setIncludeTests] = useState(true)
  const [includeStorybook, setIncludeStorybook] = useState(false)
  const [includeDocumentation, setIncludeDocumentation] = useState(true)
  const [optimizeForProduction, setOptimizeForProduction] = useState(true)
  const [includeAnimations, setIncludeAnimations] = useState(false)

  const exportFormats = [
    { value: "react-tsx", label: "React TypeScript", description: "Modern React with TypeScript" },
    { value: "react-js", label: "React JavaScript", description: "React with JavaScript" },
    { value: "html-css", label: "HTML + CSS", description: "Static HTML with CSS" },
    { value: "vue", label: "Vue 3", description: "Vue 3 with Composition API" },
    { value: "svelte", label: "Svelte", description: "Svelte components" },
    { value: "figma-plugin", label: "Figma Plugin", description: "Figma plugin format" },
  ]

  const frameworks = [
    { value: "nextjs", label: "Next.js", description: "React framework with SSR" },
    { value: "react", label: "Create React App", description: "Standard React setup" },
    { value: "vite", label: "Vite", description: "Fast build tool" },
    { value: "vanilla", label: "Vanilla", description: "No framework" },
    { value: "nuxt", label: "Nuxt.js", description: "Vue framework" },
    { value: "sveltekit", label: "SvelteKit", description: "Svelte framework" },
  ]

  const stylingOptions = [
    { value: "tailwind", label: "Tailwind CSS", description: "Utility-first CSS" },
    { value: "css-modules", label: "CSS Modules", description: "Scoped CSS" },
    { value: "styled-components", label: "Styled Components", description: "CSS-in-JS" },
    { value: "scss", label: "SCSS", description: "Sass preprocessor" },
    { value: "emotion", label: "Emotion", description: "Performant CSS-in-JS" },
    { value: "css", label: "Plain CSS", description: "Standard CSS" },
  ]

  const handleExport = async () => {
    const options = {
      format: exportFormat,
      framework,
      styling,
      options: {
        includeTests,
        includeStorybook,
        includeDocumentation,
        optimizeForProduction,
        includeAnimations,
      },
    }

    await onExport(options)
    setOpen(false)
  }

  const getFrameworksForFormat = () => {
    switch (exportFormat) {
      case "react-tsx":
      case "react-js":
        return frameworks.filter((f) => ["nextjs", "react", "vite", "vanilla"].includes(f.value))
      case "vue":
        return frameworks.filter((f) => ["nuxt", "vite", "vanilla"].includes(f.value))
      case "svelte":
        return frameworks.filter((f) => ["sveltekit", "vite", "vanilla"].includes(f.value))
      default:
        return [{ value: "vanilla", label: "Vanilla", description: "No framework" }]
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-transparent">
          <Code className="mr-2 h-4 w-4" />
          Export Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Code
            <Badge variant="outline">{wireframe?.wireframe?.metadata?.screenType}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="format" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="format">Format</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="format" className="space-y-4">
            <div>
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exportFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      <div>
                        <div className="font-medium">{format.label}</div>
                        <div className="text-xs text-muted-foreground">{format.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Framework</Label>
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getFrameworksForFormat().map((fw) => (
                    <SelectItem key={fw.value} value={fw.value}>
                      <div>
                        <div className="font-medium">{fw.label}</div>
                        <div className="text-xs text-muted-foreground">{fw.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Styling</Label>
              <Select value={styling} onValueChange={setStyling}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stylingOptions.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      <div>
                        <div className="font-medium">{style.label}</div>
                        <div className="text-xs text-muted-foreground">{style.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="options" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Include Tests</Label>
                  <p className="text-xs text-muted-foreground">Generate unit tests for components</p>
                </div>
                <Switch checked={includeTests} onCheckedChange={setIncludeTests} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Include Documentation</Label>
                  <p className="text-xs text-muted-foreground">Generate README and component docs</p>
                </div>
                <Switch checked={includeDocumentation} onCheckedChange={setIncludeDocumentation} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Production Optimization</Label>
                  <p className="text-xs text-muted-foreground">Include build configs and optimizations</p>
                </div>
                <Switch checked={optimizeForProduction} onCheckedChange={setOptimizeForProduction} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Include Animations</Label>
                  <p className="text-xs text-muted-foreground">Add micro-interactions and transitions</p>
                </div>
                <Switch checked={includeAnimations} onCheckedChange={setIncludeAnimations} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Storybook Stories</Label>
                  <p className="text-xs text-muted-foreground">Generate Storybook stories for components</p>
                </div>
                <Switch checked={includeStorybook} onCheckedChange={setIncludeStorybook} />
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Export Preview
                </h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Format: {exportFormats.find((f) => f.value === exportFormat)?.label}</p>
                  <p>• Framework: {getFrameworksForFormat().find((f) => f.value === framework)?.label}</p>
                  <p>• Styling: {stylingOptions.find((s) => s.value === styling)?.label}</p>
                  <p>
                    • Features:{" "}
                    {[
                      includeTests && "Tests",
                      includeStorybook && "Storybook",
                      includeDocumentation && "Docs",
                      optimizeForProduction && "Production",
                      includeAnimations && "Animations",
                    ]
                      .filter(Boolean)
                      .join(", ") || "Basic"}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Code
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
