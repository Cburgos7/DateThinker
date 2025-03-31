import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { getCurrentUser } from "@/lib/supabase"

export default async function AboutPage() {
  const user = await getCurrentUser()
  return (
    <>
      <Header 
        isLoggedIn={!!user} 
        userName={user?.full_name || undefined}
        avatarUrl={user?.avatar_url || undefined}
      />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-purple-500">
          About DateThinker
        </h1>

        <div className="prose max-w-none">
          <p className="text-lg mb-6">
            DateThinker was created to solve a common problem: figuring out where to go on a date. Whether you're
            planning a first date, celebrating an anniversary, or just want to try something new with your partner,
            DateThinker helps you discover the perfect spots in your city.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
          <p>
            Our mission is to make date planning simple, fun, and stress-free. We believe that everyone deserves amazing
            date experiences without the hassle of endless searching and decision fatigue.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">How It Works</h2>
          <p>
            DateThinker uses advanced location data to find the best restaurants, activities, and drink spots in your
            area. Simply enter your city, select your preferences, and we'll suggest the perfect combination for your
            date.
          </p>
          <p>
            Don't like a suggestion? Just hit refresh to get a new recommendation without starting over. When you find
            places you love, save them to your favorites for future reference.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Our Team</h2>
          <p>
            DateThinker was created by a small team of developers and designers who are passionate about creating useful
            tools that enhance people's lives and relationships.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
          <p>
            Have questions, suggestions, or feedback? We'd love to hear from you! Reach out to us at{" "}
            <a href="mailto:contact@datethinker.com" className="text-rose-500 hover:underline">
              contact@datethinker.com
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}

