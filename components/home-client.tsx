"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { getCurrentUser } from "@/lib/supabase"

// Date image slideshow data
const dateImages = [
  {
    src: "https://placehold.co/1200x800/e2336b/FFFFFF?text=Romantic+Dinner",
    alt: "Romantic dinner date",
    caption: "Discover the perfect dining experience"
  },
  {
    src: "https://placehold.co/1200x800/46924f/FFFFFF?text=Outdoor+Adventure",
    alt: "Outdoor adventure date",
    caption: "Find exciting outdoor activities"
  },
  {
    src: "https://placehold.co/1200x800/8c7ae6/FFFFFF?text=Coffee+Shop+Date",
    alt: "Coffee shop date",
    caption: "Cozy coffee shop recommendations"
  },
  {
    src: "https://placehold.co/1200x800/f39c12/FFFFFF?text=Fun+Activities",
    alt: "Fun activity date",
    caption: "Unique activities for memorable dates"
  },
  {
    src: "https://placehold.co/1200x800/3498db/FFFFFF?text=Evening+Date+Night",
    alt: "Evening date night",
    caption: "Perfect evening plans"
  }
]

export function HomeClient() {
  const router = useRouter()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Fetch current user on component mount
  useEffect(() => {
    async function fetchUser() {
      try {
        setIsLoadingUser(true)
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setIsLoadingUser(false)
      }
    }

    fetchUser()
  }, [])

  // Rotate through slide images
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % dateImages.length)
    }, 5000) // Change image every 5 seconds

    return () => clearInterval(intervalId)
  }, [])

  // Handle start button click to either navigate to search or prompt sign in
  const handleStartClick = () => {
    if (user) {
      router.push("/make-date") // Navigate to make a date page
    } else {
      router.push("/auth?showForm=true&manualSignIn=true") // Navigate to auth page with required parameters
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[var(--gradient-start)] to-[var(--gradient-end)]">
      <Header isLoggedIn={!!user} userName={user?.email?.split("@")[0]} />
      
      <main className="flex-grow flex flex-col md:flex-row items-center overflow-hidden relative">
        {/* Background slideshow */}
        <div className="absolute inset-0 z-0 opacity-20">
          {dateImages.map((image, index) => (
            <div 
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentImageIndex ? "opacity-100" : "opacity-0"
              }`}
              style={{ zIndex: index === currentImageIndex ? 1 : 0 }}
            >
              <div className="w-full h-full relative">
                <Image 
                  src={image.src} 
                  alt={image.alt}
                  fill
                  style={{ objectFit: "cover" }}
                  priority={index === 0}
                  unoptimized
                />
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="z-10 w-full max-w-6xl mx-auto px-4 py-12 flex flex-col md:flex-row items-center gap-8">
          {/* Left side - Hero Text */}
          <div className="md:w-1/2 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-rose-600 mb-4">
              DateThinker
            </h1>
            <p className="text-2xl md:text-3xl font-semibold text-gray-800 mb-4">
              Your Personal Date Planner
            </p>
            <p className="text-lg text-gray-700 mb-6">
              Discover perfect date ideas tailored to your location. Let us handle the planning so you can focus on creating memories.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button
                onClick={handleStartClick}
                size="lg" 
                className="bg-rose-500 hover:bg-rose-600 text-white px-8"
              >
                {user ? "Find Date Ideas" : "Get Started"}
              </Button>
              {!user && (
                <Button
                  variant="outline"
                  size="lg" 
                  asChild
                  className="border-rose-500 text-rose-500 hover:bg-rose-50"
                >
                  <Link href="/auth?showForm=true&manualSignIn=true">Sign In</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Right side - Features */}
          <div className="md:w-1/2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Complete Date Plans",
                description: "Get full date itineraries with restaurants, activities and more",
                icon: "📋"
              },
              {
                title: "Save Your Favorites",
                description: "Create collections of your favorite date ideas",
                icon: "❤️"
              },
              {
                title: "Make Creative Date Ideas",
                description: "Get inspired with unique and memorable date suggestions",
                icon: "🎉"
              },
              {
                title: "Easy Sharing",
                description: "Share your date plans with your partner",
                icon: "🔗"
              }
            ].map((feature, index) => (
              <Card key={index} className="p-4 bg-white/80 backdrop-blur-sm hover:shadow-md transition-shadow">
                <div className="text-2xl mb-2">{feature.icon}</div>
                <h3 className="font-bold text-gray-800">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Caption overlay for current image */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-black/50 text-white px-6 py-3 rounded-full text-sm backdrop-blur-sm shadow-md">
            {dateImages[currentImageIndex].caption}
          </div>
        </div>
      </main>
      
      {/* How it works section */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">How DateThinker Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Sign Up",
                description: "Create your free account in seconds to unlock all features",
                icon: "👤"
              },
              {
                step: "2",
                title: "Enter Your Location",
                description: "Tell us where you're planning your date",
                icon: "📍"
              },
              {
                step: "3",
                title: "Discover Date Ideas",
                description: "Get AI-powered recommendations tailored just for you",
                icon: "✨"
              }
            ].map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-2xl font-bold mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
                <div className="text-4xl mt-4">{step.icon}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Testimonials section */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">What Our Users Say</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "DateThinker saved my anniversary! Found the perfect restaurant and activity with just a few clicks.",
                author: "Michael R.",
                location: "San Francisco"
              },
              {
                quote: "I was tired of the same old dinner dates. DateThinker helped us discover amazing new experiences in our city.",
                author: "Jessica T.",
                location: "Chicago"
              },
              {
                quote: "As someone who hates planning, this app is a lifesaver. My dates think I'm so thoughtful now!",
                author: "David L.",
                location: "Boston"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="p-6 bg-white">
                <div className="text-2xl mb-4">"</div>
                <p className="text-gray-700 mb-4 italic">{testimonial.quote}</p>
                <div className="mt-auto">
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-gray-500">{testimonial.location}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA section */}
      <section className="bg-rose-500 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Plan Your Perfect Date?</h2>
          <p className="text-lg mb-8 text-rose-100">
            Join thousands of couples who have discovered amazing date ideas with DateThinker.
          </p>
          {user ? (
            <Button
              onClick={() => router.push('/make-date')}
              size="lg" 
              className="bg-white text-rose-500 hover:bg-rose-100 px-8 py-6 text-lg"
            >
              Find Date Ideas Now
            </Button>
          ) : (
            <Button
              onClick={() => router.push('/auth?showForm=true&manualSignIn=true')}
              size="lg" 
              className="bg-white text-rose-500 hover:bg-rose-100 px-8 py-6 text-lg"
            >
              Sign Up Free
            </Button>
          )}
        </div>
      </section>
      
      <Footer />
    </div>
  )
} 