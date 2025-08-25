import { type NextRequest, NextResponse } from "next/server"
import { ConversationAgent } from "@/lib/agents/conversation-agent"

export async function POST(request: NextRequest) {
  try {
    const { messages, phase } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 })
    }

    const apiKey = process.env.NEBIUS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "NEBIUS_API_KEY environment variable is not configured" }, { status: 500 })
    }

    // Conversation processing
    const conversationAgent = new ConversationAgent()
    conversationAgent.setApiKey(apiKey)
    const result = await conversationAgent.process({
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      context: {
        phase: phase || "chatting",
        previousRequirements: [],
      },
    })

    return NextResponse.json({
      message: result.response,
      readyToGenerate: result.readyToGenerate,
      requirements: result.requirements,
    })
  } catch (error) {
    console.error("Chat conversation error:", error)
    return NextResponse.json({ error: "Failed to process conversation" }, { status: 500 })
  }
}
