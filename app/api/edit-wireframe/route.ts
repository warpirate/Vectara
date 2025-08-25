import { type NextRequest, NextResponse } from "next/server"
import { AgentOrchestrator } from "@/lib/agents/agent-orchestrator"

export async function POST(request: NextRequest) {
  try {
    const { wireframe, editPrompt, componentId, editMode, preserveLayout } = await request.json()

    if (!wireframe || !editPrompt) {
      return NextResponse.json({ error: "Wireframe and edit prompt are required" }, { status: 400 })
    }

    const validEditModes = ["full", "component", "text-only", "layout-only", "style-only"]
    const mode = editMode && validEditModes.includes(editMode) ? editMode : "full"

    const apiKey = process.env.NEBIUS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "NEBIUS_API_KEY environment variable is not configured" }, { status: 500 })
    }

    const orchestrator = new AgentOrchestrator(apiKey)

    const result = await orchestrator.editWireframe(wireframe, editPrompt, {
      componentId,
      editMode: mode,
      preserveLayout: preserveLayout ?? false,
      targetComponent: componentId,
    })

    const enhancedResult = {
      ...result,
      editMetadata: {
        editedAt: new Date().toISOString(),
        editMode: mode,
        targetComponent: componentId,
        preservedLayout: preserveLayout,
        promptLength: editPrompt.length,
      },
    }

    return NextResponse.json(enhancedResult)
  } catch (error: any) {
    console.error("Wireframe edit error:", error)

    if (error.message?.includes("Component not found")) {
      return NextResponse.json(
        { error: "The specified component could not be found in the wireframe." },
        { status: 404 },
      )
    }

    if (error.message?.includes("Invalid edit mode")) {
      return NextResponse.json({ error: "Invalid edit mode specified." }, { status: 400 })
    }

    if (error.message?.includes("Content safety")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: "Failed to edit wireframe. Please try again.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}
