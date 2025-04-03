import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Coffee, Gift } from "lucide-react"
import { getCurrentUser } from "@/lib/supabase"

export default async function DonatePage() {
  const user = await getCurrentUser()

  return (
    <>
      <Header isLoggedIn={!!user} userName={user?.full_name} avatarUrl={user?.avatar_url} />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-purple-500">
          Support DateThinker
        </h1>

        <p className="text-center text-lg mb-12 max-w-2xl mx-auto">
          DateThinker is a passion project created to help people discover great date ideas. Your donations help us keep
          the service running and improving.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">Coffee</CardTitle>
                <Coffee className="h-5 w-5 text-amber-600" />
              </div>
              <CardDescription>Buy us a coffee</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">$5</p>
              <p className="text-sm text-muted-foreground mt-2">A small donation to fuel our development sessions</p>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-amber-600 hover:bg-amber-700">Donate $5</Button>
            </CardFooter>
          </Card>

          <Card className="border-rose-200 shadow-md">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">Supporter</CardTitle>
                <Gift className="h-5 w-5 text-rose-500" />
              </div>
              <CardDescription>Show your appreciation</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">$20</p>
              <p className="text-sm text-muted-foreground mt-2">Help us cover hosting costs and add new features</p>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90">
                Donate $20
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">Champion</CardTitle>
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <CardDescription>Become a major supporter</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">$50</p>
              <p className="text-sm text-muted-foreground mt-2">
                Make a significant contribution to our project's future
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-purple-600 hover:bg-purple-700">Donate $50</Button>
            </CardFooter>
          </Card>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Custom Amount</h2>
          <p className="mb-6">Want to contribute a different amount? You can specify any custom donation:</p>
          <div className="flex gap-4 flex-wrap">
            <Button variant="outline" className="border-rose-300 text-rose-600 hover:bg-rose-50">
              $10
            </Button>
            <Button variant="outline" className="border-rose-300 text-rose-600 hover:bg-rose-50">
              $25
            </Button>
            <Button variant="outline" className="border-rose-300 text-rose-600 hover:bg-rose-50">
              $75
            </Button>
            <Button variant="outline" className="border-rose-300 text-rose-600 hover:bg-rose-50">
              $100
            </Button>
            <Button variant="outline" className="border-rose-300 text-rose-600 hover:bg-rose-50">
              Custom
            </Button>
          </div>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">Other Ways to Support</h2>
          <p className="max-w-2xl mx-auto mb-6">Don't want to donate money? You can still help us by:</p>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="font-medium mb-2">Spread the Word</h3>
              <p className="text-sm text-muted-foreground">Share DateThinker with your friends and on social media</p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="font-medium mb-2">Give Feedback</h3>
              <p className="text-sm text-muted-foreground">Help us improve by sharing your ideas and suggestions</p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <h3 className="font-medium mb-2">Contribute Code</h3>
              <p className="text-sm text-muted-foreground">
                If you're a developer, consider contributing to our project
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

