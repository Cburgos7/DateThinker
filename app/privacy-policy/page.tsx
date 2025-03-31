export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

        <div className="prose">
          <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Introduction</h2>
          <p className="mb-4">
            Welcome to DateThinker. We respect your privacy and are committed to protecting your personal data. This
            privacy policy will inform you about how we look after your personal data when you visit our website and
            tell you about your privacy rights and how the law protects you.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Data We Collect</h2>
          <p className="mb-4">When you use DateThinker, we may collect the following types of information:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Search queries (cities and preferences)</li>
            <li>Usage data (how you interact with our site)</li>
            <li>Device information (browser type, operating system)</li>
            <li>IP address and approximate location (city level)</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">How We Use Your Data</h2>
          <p className="mb-4">We use your data to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Provide and improve our services</li>
            <li>Personalize your experience</li>
            <li>Analyze usage patterns to enhance our website</li>
            <li>Prevent fraud and abuse</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">Cookies and Similar Technologies</h2>
          <p className="mb-4">
            DateThinker uses cookies and similar tracking technologies to track activity on our website and store
            certain information. Cookies are files with a small amount of data which may include an anonymous unique
            identifier.
          </p>
          <p className="mb-4">We use the following types of cookies:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Essential cookies: Necessary for the website to function properly</li>
            <li>Analytics cookies: Help us understand how visitors interact with our website</li>
            <li>Advertising cookies: Used to deliver relevant advertisements and marketing campaigns</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">Third-Party Services</h2>
          <p className="mb-4">We use the following third-party services:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Google AdSense: For displaying advertisements</li>
            <li>Google Analytics: For analyzing website traffic and user behavior</li>
            <li>Unsplash: For displaying images</li>
          </ul>
          <p className="mb-4">
            These third-party services may collect information sent by your browser as part of a web page request. They
            have their own privacy policies that govern how they use this information.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Data Security</h2>
          <p className="mb-4">
            We implement appropriate security measures to protect your personal data against unauthorized access,
            alteration, disclosure, or destruction. However, no method of transmission over the Internet or method of
            electronic storage is 100% secure.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Your Rights</h2>
          <p className="mb-4">
            Depending on your location, you may have certain rights regarding your personal data, including:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>The right to access your personal data</li>
            <li>The right to rectification of inaccurate data</li>
            <li>The right to erasure of your data</li>
            <li>The right to restrict processing</li>
            <li>The right to data portability</li>
            <li>The right to object to processing</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">Changes to This Privacy Policy</h2>
          <p className="mb-4">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
            Privacy Policy on this page and updating the "Last updated" date.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">Contact Us</h2>
          <p className="mb-4">If you have any questions about this Privacy Policy, please contact us at:</p>
          <p className="mb-4">Email: privacy@datethinker.com</p>
        </div>
      </div>
    </div>
  )
}

