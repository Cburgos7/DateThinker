import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-gray-100 py-4 sm:py-6 mt-8 sm:mt-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-3 md:mb-0">
            <p className="text-sm text-gray-600">&copy; {new Date().getFullYear()} DateThinker. All rights reserved.</p>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/privacy-policy" className="text-sm text-gray-600 hover:text-rose-500 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-gray-600 hover:text-rose-500 transition-colors">
              Terms of Service
            </Link>
            <a
              href="mailto:contact@datethinker.com"
              className="text-sm text-gray-600 hover:text-rose-500 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

