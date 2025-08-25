"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Loader2, Send, User, Bot, Sparkles, MessageSquare } from "lucide-react"
import type { LayoutOutput } from "@/lib/agents/layout-generator-agent"
import type { SitemapOutput } from "@/lib/agents/sitemap-generator-agent"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  type?: "text" | "wireframe-ready" | "wireframe-generated"
  wireframe?: LayoutOutput
}

interface ChatInterfaceProps {
  onWireframeGenerated: (wireframe: LayoutOutput) => void
  onSitemapGenerated?: (sitemap: SitemapOutput) => void
}

export default function ChatInterface({ onWireframeGenerated, onSitemapGenerated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [debouncedInput, setDebouncedInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationPhase, setConversationPhase] = useState<"chatting" | "ready-to-generate" | "generating">(
    "chatting",
  )
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Fallback readiness detector: shows the button when assistant wording implies readiness
  const readinessRegex = useMemo(
    () =>
      /ready for me to create|ready to create|generate your wireframe|create your wireframe|clear picture.*ready|i'?ll create|i will create|i'?ll generate|i will generate|generating your wireframe|let me create|let me generate|ready to craft your wireframe|let'?s create your wireframe|shall i generate|want me to create/i,
    [],
  )

  // Detect sitemap intent mentions
  const sitemapRegex = useMemo(
    () => /sitemap|site\s*map|page structure|pages? list|navigation map/i,
    [],
  )

  // Detect enthusiastic or affirmative confirmations from the user to auto-trigger generation
  const affirmativeRegex = useMemo(
    () => /^(yes|yep|yeah|y|sure|do it|go|go for it|let'?s go+|let'?s do it|please generate|start|begin|ship it|launch it|let'?s g+o+|lets go+|let'?s g+oooo+|g+o+)+[!\.\s]*$/i,
    [],
  )

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [])

  const generateSitemap = async () => {
    setConversationPhase("generating")
    setIsLoading(true)

    try {
      const conversationHistory = messages
        .filter((m) => m.role === "user" || (m.role === "assistant" && m.type !== "wireframe-ready"))
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")

      const response = await fetch("/api/generate-sitemap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: conversationHistory,
          options: { batchGenerate: true },
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const sitemapMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "Awesome! I generated a multi-page sitemap based on our conversation and created initial wireframes where helpful.",
          timestamp: Date.now(),
          type: "text",
        }

        setMessages((prev) => [...prev, sitemapMessage])
        if (typeof (onSitemapGenerated) === 'function') {
          onSitemapGenerated(data.sitemap as SitemapOutput)
        }
        setConversationPhase("chatting")
      } else {
        throw new Error(data.error || "Sitemap generation failed")
      }
    } catch (error) {
      console.error("Sitemap generation error:", error)
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, I couldn't generate the sitemap. Let's refine details and try again.",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setConversationPhase("chatting")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(input)
    }, 300)

    return () => clearTimeout(timer)
  }, [input])

  // Auto-generate when assistant indicates readiness and the user immediately confirms enthusiastically
  useEffect(() => {
    if (conversationPhase === "generating") return
    if (messages.length < 2) return

    const last = messages[messages.length - 1]
    const prev = messages[messages.length - 2]

    // If the assistant just indicated readiness and the user then confirms, trigger generation
    const assistantReady = prev.role === "assistant" && (prev.type === "wireframe-ready" || readinessRegex.test(prev.content))
    const userAffirm = last.role === "user" && affirmativeRegex.test(last.content.trim())

    if (assistantReady && userAffirm) {
      generateWireframe()
    }
  }, [messages, conversationPhase])

  // Initialize the welcome message on the client to avoid SSR hydration mismatches
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi! I'm your AI product design copilot. I can: generate editable wireframes, make targeted AI edits (component/text/layout/style), critique for accessibility/usability, export code (React/HTML/Vue/Svelte), and create visual previews (sketch/polished). Tell me what you're building and who it's for—I'll guide you and offer the right next action.",
        timestamp: Date.now(),
      },
    ])
  }, [])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = input.trim()
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          phase: conversationPhase,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const contentReady = readinessRegex.test(String(data.message || ""))
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: Date.now(),
        // Fallback: if server didn't flag readiness but text clearly implies it, still show the button
        type: data.readyToGenerate || contentReady ? "wireframe-ready" : "text",
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (data.readyToGenerate || contentReady) {
        setConversationPhase("ready-to-generate")
      }
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, conversationPhase])

  const generateWireframe = async () => {
    setConversationPhase("generating")
    setIsLoading(true)

    try {
      const conversationHistory = messages
        .filter((m) => m.role === "user" || (m.role === "assistant" && m.type !== "wireframe-ready"))
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")

      const response = await fetch("/api/generate-wireframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: conversationHistory,
          conversational: true,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const wireframeMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "Great! I've generated your wireframe based on our conversation. You can now edit it using the canvas on the right.",
          timestamp: Date.now(),
          type: "wireframe-generated",
          wireframe: data.wireframe,
        }

        setMessages((prev) => [...prev, wireframeMessage])
        onWireframeGenerated(data.wireframe)
        setConversationPhase("chatting")
      } else {
        throw new Error(data.error || "Generation failed")
      }
    } catch (error) {
      console.error("Wireframe generation error:", error)
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, I couldn't generate the wireframe. Let's continue our conversation and try again.",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setConversationPhase("chatting")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.closest('form')
      if (form) {
        const submitEvent = new Event('submit', { cancelable: true })
        form.dispatchEvent(submitEvent)
      }
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="h-5 w-5" />
          AI Assistant
        </h2>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <div ref={scrollAreaRef} className="h-full overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div className={`max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                <Card
                  className={`p-3 ${
                    message.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {message.role === "assistant" && (message.type === "wireframe-ready" || readinessRegex.test(message.content) || sitemapRegex.test(message.content)) && conversationPhase !== "generating" && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <Button onClick={generateWireframe} disabled={isLoading} className="w-full" size="sm">
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Wireframe...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Wireframe
                          </>
                        )}
                      </Button>
                      <Button onClick={generateSitemap} disabled={isLoading} className="w-full mt-2" size="sm" variant="outline">
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Sitemap...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Sitemap
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </Card>

                <p className="text-xs text-muted-foreground mt-1 px-1">{new Date(message.timestamp).toLocaleTimeString()}</p>
              </div>

              {message.role === "user" && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {isLoading && conversationPhase === "chatting" && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="p-3 bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </Card>
            </div>
          )}
            </div>
          </ScrollArea>
        </div>
      </div>
      {/* Global CTA fallback: show Generate Wireframe even if inline CTA is missed */}
      {(() => {
        const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")
        const showGlobal =
          conversationPhase !== "generating" && (conversationPhase === "ready-to-generate" || readinessRegex.test(lastAssistant?.content || ""))
        return showGlobal ? (
          <div className="px-4 pb-2 space-y-2">
            <Button onClick={generateWireframe} disabled={isLoading} className="w-full" variant="default">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating Wireframe...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Generate Wireframe
                </>
              )}
            </Button>
            <Button onClick={generateSitemap} disabled={isLoading} className="w-full" variant="outline">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating Sitemap...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Generate Sitemap
                </>
              )}
            </Button>
          </div>
        ) : null
      })()}

      <div className="border-t p-4 bg-background/50 backdrop-blur-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-background"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
