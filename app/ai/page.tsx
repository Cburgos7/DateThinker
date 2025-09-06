"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Send, Bot, User, ArrowLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/contexts/auth-context"

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

export default function AIPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm your AI date planning assistant. I can help you create the perfect date experience. What kind of date are you planning?",
      role: 'assistant',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputValue)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase()
    
    if (input.includes('romantic') || input.includes('dinner') || input.includes('anniversary')) {
      return "For a romantic date, I'd suggest starting with a cozy dinner at a fine dining restaurant. How about we look for places with intimate lighting and great wine selections? After dinner, you could take a moonlit walk or visit a rooftop bar with city views. What's your budget range and preferred cuisine?"
    }
    
    if (input.includes('fun') || input.includes('adventure') || input.includes('active')) {
      return "An adventurous date sounds exciting! I can suggest activities like escape rooms, mini golf, bowling, or even a cooking class together. For outdoor adventures, we could look into hiking trails, kayaking, or visiting an amusement park. What type of adventure appeals to you most?"
    }
    
    if (input.includes('budget') || input.includes('cheap') || input.includes('free')) {
      return "Great! I love helping with budget-friendly dates. Some amazing free or low-cost options include: visiting a local museum (many have free days), having a picnic in the park, exploring a farmers market, or taking a scenic drive. For under $50, we could do coffee and a movie, or find happy hour deals at local restaurants. What's your budget range?"
    }
    
    if (input.includes('first date') || input.includes('first time')) {
      return "First dates are special! I recommend keeping it casual and low-pressure. Coffee shops, casual restaurants, or a walk in a nice park are perfect. This gives you both a chance to talk and get to know each other without feeling trapped in a long commitment. What's your partner's interests? I can suggest activities that align with what they might enjoy."
    }
    
    if (input.includes('weekend') || input.includes('saturday') || input.includes('sunday')) {
      return "Weekend dates are perfect for longer activities! We could plan a day trip to a nearby town, visit a winery or brewery, go to a farmers market and cook together, or explore a new neighborhood. What kind of weekend experience are you looking for - relaxing or more active?"
    }
    
    if (input.includes('weather') || input.includes('rain') || input.includes('indoor')) {
      return "No worries about the weather! Indoor date options are endless. Museums, art galleries, indoor markets, cooking classes, escape rooms, bowling, or even a cozy bookstore with a café are great options. We could also find restaurants with covered patios or beautiful indoor dining rooms. What's your preference for indoor activities?"
    }
    
    // Default response
    return "That sounds interesting! I'd love to help you plan that. Could you tell me more about your preferences? For example, what's your budget range, what activities do you both enjoy, and are you looking for something romantic, fun, or adventurous? The more details you share, the better I can tailor my suggestions!"
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Sparkles className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">AI Date Planner</h1>
                  <p className="text-sm text-gray-600">Your personal date planning assistant</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <Card className="max-w-4xl mx-auto shadow-lg">
            <CardContent className="p-0">
              {/* Messages */}
              <div className="h-96 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex items-start space-x-3 max-w-[80%] ${
                        message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-4">
                <div className="flex space-x-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about planning your perfect date..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Suggestions */}
          <div className="max-w-4xl mx-auto mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Ideas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                "Plan a romantic dinner date",
                "Find fun activities for a first date",
                "Suggest budget-friendly date ideas",
                "Plan an adventurous outdoor date",
                "Find indoor activities for bad weather",
                "Plan a weekend day trip"
              ].map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => setInputValue(suggestion)}
                  className="h-auto p-4 text-left justify-start hover:bg-blue-50 hover:border-blue-200"
                >
                  <span className="text-sm">{suggestion}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
