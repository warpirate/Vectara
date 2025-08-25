"use client"

import { useCallback, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Eye, Upload, MessageSquare, Plus } from "lucide-react"
import { WireframeCanvas } from "@/components/wireframe-canvas"
import { ExportDialog } from "@/components/export-dialog"
import ChatInterface from "@/components/chat-interface"
import { ManualWireframeCreator } from "@/components/manual-wireframe-creator"
import { CollapsibleSidebar } from "@/components/collapsible-sidebar"
import JSZip from "jszip"
import type { LayoutOutput } from "@/lib/agents/layout-generator-agent"
import type { SitemapOutput, SitemapPage } from "@/lib/agents/sitemap-generator-agent"

export default function WireframeGenerator() {
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingSitemap, setIsGeneratingSitemap] = useState(false)
  const [wireframe, setWireframe] = useState<LayoutOutput | null>(null)
  const [showManualCreator, setShowManualCreator] = useState(false)
  const [sitemap, setSitemap] = useState<SitemapOutput | null>(null)
  const [activePageId, setActivePageId] = useState<string | null>(null)

  const handleWireframeGenerated = (newWireframe: LayoutOutput) => {
    setWireframe(newWireframe)
    setShowManualCreator(false)
  }

  const handleExportFigma = () => {
    if (!wireframe) return
    return handleExportCode({
      format: "figma-plugin",
      framework: "vanilla",
      styling: "css",
      options: { includeDocumentation: true },
    })
  }

  const handleManualWireframeCreated = (newWireframe: LayoutOutput) => {
    setWireframe(newWireframe)
    setShowManualCreator(false)
  }

  const handleSitemapGenerated = (sm: SitemapOutput) => {
    setSitemap(sm)
    const flattened = flattenPages(sm.project.pages)
    const candidate = flattened.find((p) => !!p.wireframe) || flattened[0]
    if (candidate) {
      setActivePageId(candidate.id)
      if (candidate.wireframe) setWireframe(candidate.wireframe)
    }
  }

  const flattenPages = useCallback((pages: SitemapPage[]): SitemapPage[] => {
    const out: SitemapPage[] = []
    const walk = (ps: SitemapPage[]) => {
      for (const p of ps) {
        out.push(p)
        if (p.children && p.children.length) walk(p.children)
      }
    }
    walk(pages)
    return out
  }, [])

  const allPages = useMemo(() => (sitemap ? flattenPages(sitemap.project.pages) : []), [sitemap, flattenPages])

  const findPageById = useCallback(
    (id: string | null) => (id ? allPages.find((p) => p.id === id) : undefined),
    [allPages],
  )

  const firstPageWithWireframe = useCallback((): SitemapPage | undefined => {
    return allPages.find((p) => !!p.wireframe) || allPages[0]
  }, [allPages])

  const handleSelectPage = (pageId: string) => {
    setActivePageId(pageId)
    const p = allPages.find((x) => x.id === pageId)
    if (p?.wireframe) setWireframe(p.wireframe)
  }

  const handleGenerateSitemap = async () => {
    const prompt = window.prompt(
      "Describe your product/site to generate a multi-page sitemap (e.g., SaaS with landing, pricing, docs, login):",
    )
    if (!prompt) return
    setIsGeneratingSitemap(true)
    try {
      const res = await fetch("/api/generate-sitemap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, options: { batchGenerate: true } }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to generate sitemap")
      const sm: SitemapOutput = data.sitemap
      setSitemap(sm)
      const first = sm.project.pages?.[0]
      const candidate = first?.wireframe ? first : firstPageWithWireframe()
      if (candidate) {
        setActivePageId(candidate.id)
        if (candidate.wireframe) setWireframe(candidate.wireframe)
      }
    } catch (e) {
      console.error("Generate sitemap failed", e)
    } finally {
      setIsGeneratingSitemap(false)
    }
  }

  const handleEditWithAI = async (componentId: string, editPrompt: string, options: any) => {
    if (!wireframe) return

    try {
      const response = await fetch("/api/edit-wireframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wireframe,
          editPrompt,
          componentId,
          editMode: options.editMode,
          preserveLayout: options.preserveLayout,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setWireframe(result)

        if (result.editData?.changes?.length > 0) {
          const changeDescriptions = result.editData.changes.map((change: any) => change.description).join(", ")
          console.log("Applied changes:", changeDescriptions)
        }
      } else {
        console.error("Edit failed:", result.error)
      }
    } catch (error) {
      console.error("Edit failed:", error)
    }
  }

  const handleExportCode = async (exportOptions: any) => {
    if (!wireframe) return

    setIsExporting(true)
    try {
      const response = await fetch("/api/export-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wireframe,
          format: exportOptions.format,
          framework: exportOptions.framework,
          styling: exportOptions.styling,
          options: exportOptions.options,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        const zip = new JSZip()

        result.files.forEach((file: any) => {
          zip.file(file.filename, file.content)
        })

        if (!result.files.find((f: any) => f.filename === "package.json") && result.dependencies?.length > 0) {
          const packageJson = {
            name: wireframe.wireframe.title.toLowerCase().replace(/\s+/g, "-"),
            version: "1.0.0",
            description: wireframe.wireframe.description,
            dependencies: result.dependencies.reduce((acc: any, dep: string) => {
              acc[dep] = "latest"
              return acc
            }, {}),
            devDependencies: result.devDependencies?.reduce((acc: any, dep: string) => {
              acc[dep] = "latest"
              return acc
            }, {}),
            scripts: result.scripts || {},
          }
          zip.file("package.json", JSON.stringify(packageJson, null, 2))
        }

        if (!result.files.find((f: any) => f.filename.toLowerCase().includes("readme"))) {
          const readme = `# ${wireframe.wireframe.title}

${wireframe.wireframe.description}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

${result.instructions}

## Notes

${result.notes.map((note: string) => `- ${note}`).join("\n")}
`
          zip.file("README.md", readme)
        }

        const content = await zip.generateAsync({ type: "blob" })
        const url = URL.createObjectURL(content)
        const a = document.createElement("a")
        a.href = url
        a.download = `${wireframe.wireframe.title.replace(/\s+/g, "-")}-${exportOptions.format}.zip`
        a.click()
        URL.revokeObjectURL(url)

        console.log("Export completed:", result.exportMetadata)
      } else {
        console.error("Export failed:", result.error)
      }
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCritique = async () => {
    if (!wireframe) return

    try {
      const response = await fetch("/api/critique-wireframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wireframe,
          focusAreas: ["accessibility", "usability"],
        }),
      })

      const result = await response.json()

      alert(
        `Critique Score: ${result.overallScore}/10\n\nIssues: ${result.critiques.length}\nStrengths: ${result.strengths.join(", ")}`,
      )
    } catch (error) {
      console.error("Critique failed:", error)
    }
  }

  const handleVisualRender = async () => {
    if (!wireframe) return

    try {
      const response = await fetch("/api/render-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wireframe,
          style: "polished",
          colorScheme: "light",
        }),
      })

      const result = await response.json()

      if (response.ok) {
        window.open(result.imageUrl, "_blank")
      } else {
        console.error("Visual render failed:", result.error)
      }
    } catch (error) {
      console.error("Visual render failed:", error)
    }
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <header className="border-b bg-card flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Wireframe Generator</h1>
              <p className="text-muted-foreground">Chat with AI to create and edit wireframes</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Powered by Nebius AI
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <CollapsibleSidebar defaultWidth={384} minWidth={280} maxWidth={640}>
          <div className="p-2 border-b">
            <Button size="sm" variant="outline" className="w-full" onClick={handleGenerateSitemap} disabled={isGeneratingSitemap}>
              {isGeneratingSitemap ? "Generating Sitemap..." : "Generate Multi-Page Sitemap"}
            </Button>
          </div>
          <ChatInterface onWireframeGenerated={handleWireframeGenerated} onSitemapGenerated={handleSitemapGenerated} />
        </CollapsibleSidebar>

        {wireframe && (
          <div className="w-80 border-r bg-muted/10 flex-shrink-0 flex flex-col">
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {sitemap && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Site Pages</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {(sitemap.project.pages || []).map((page) => (
                      <div key={page.id}>
                        <button
                          className={`w-full text-left text-xs px-2 py-1 rounded hover:bg-muted ${
                            activePageId === page.id ? "bg-primary/10" : ""
                          }`}
                          onClick={() => handleSelectPage(page.id)}
                        >
                          {page.title}
                          {page.wireframe && (
                            <Badge variant="outline" className="ml-2 text-[10px]">WF</Badge>
                          )}
                        </button>
                        {page.children && page.children.length > 0 && (
                          <div className="ml-3 mt-1 space-y-1">
                            {page.children.map((c) => (
                              <button
                                key={c.id}
                                className={`w-full text-left text-xs px-2 py-1 rounded hover:bg-muted ${
                                  activePageId === c.id ? "bg-primary/10" : ""
                                }`}
                                onClick={() => handleSelectPage(c.id)}
                              >
                                {c.title}
                                {c.wireframe && (
                                  <Badge variant="outline" className="ml-2 text-[10px]">WF</Badge>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Download className="h-4 w-4" />
                    Export Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ExportDialog wireframe={wireframe} onExport={handleExportCode} isExporting={isExporting} />
                  <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={handleVisualRender}>
                    <Eye className="mr-2 h-4 w-4" />
                    Generate Visual Preview
                  </Button>
                  <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={handleExportFigma}>
                    <Upload className="mr-2 h-4 w-4" />
                    Export to Figma
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4" />
                    AI Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={handleCritique}>
                    Get AI Critique
                  </Button>
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    Improve Accessibility
                  </Button>
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    Optimize Layout
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Wireframe Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xs">
                    <p className="font-medium">{wireframe.wireframe.title}</p>
                    <p className="text-muted-foreground">{wireframe.wireframe.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {wireframe.wireframe.components.length} components
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {wireframe.wireframe.metadata.screenType}
                    </Badge>
                    {wireframe.wireframe.metadata.responsive && (
                      <Badge variant="outline" className="text-xs">
                        Responsive
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {wireframe ? (
            <WireframeCanvas
              wireframe={wireframe}
              onEditComponent={handleEditWithAI}
              onUpdateWireframe={setWireframe}
              isEditing={false}
            />
          ) : showManualCreator ? (
            <ManualWireframeCreator
              onWireframeCreated={handleManualWireframeCreated}
              onCancel={() => setShowManualCreator(false)}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted/5">
              <div className="text-center space-y-6 max-w-md">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Start Creating</h2>
                <p className="text-muted-foreground">
                  Choose how you'd like to create your wireframe. Chat with our AI assistant for guided creation, or
                  start building manually with our visual editor.
                </p>

                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">AI-Assisted Creation:</p>
                    <p>• Describe your project goals</p>
                    <p>• Answer clarifying questions</p>
                    <p>• Generate wireframes when ready</p>
                  </div>

                  <div className="pt-4 border-t">
                    <Button onClick={() => setShowManualCreator(true)} variant="outline" className="w-full" size="lg">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Wireframe Manually
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Start with a blank canvas and build your wireframe using drag-and-drop components
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
