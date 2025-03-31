export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

        <div className="prose">
          <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-xl font-semibold mt-6 mb-3">1. Introduction</h2>
          <p className="mb-4">
            Welcome to DateThinker. These Terms of Service govern your use of our website located at datethinker.com and
            form a binding contractual agreement between you, the user of the site, and us, the site owner.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">2. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing or using our website, you agree to be bound by these Terms of Service and all applicable laws
            and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing
            this site.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">3. Use License</h2>
          <p className="mb-4">
            Permission is granted to temporarily use DateThinker for personal, non-commercial purposes. This is the
            grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose</li>
            <li>Attempt to decompile or reverse engineer any software contained on the website</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
            <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-3">4. Disclaimer</h2>
          <p className="mb-4">
            The materials on DateThinker are provided on an 'as is' basis. We make no warranties, expressed or implied,
            and hereby disclaim and negate all other warranties including, without limitation, implied warranties or
            conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual
            property.
          </p>
          <p className="mb-4">
            We do not guarantee the accuracy, completeness, or reliability of any information provided on our website.
            You rely on such information at your own risk.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">5. Limitations</h2>
          <p className="mb-4">
            In no event shall DateThinker or its suppliers be liable for any damages (including, without limitation,
            damages for loss of data or profit, or due to business interruption) arising out of the use or inability to
            use the materials on our website, even if we or an authorized representative has been notified orally or in
            writing of the possibility of such damage.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">6. Accuracy of Materials</h2>
          <p className="mb-4">
            The materials appearing on DateThinker could include technical, typographical, or photographic errors. We do
            not warrant that any of the materials on our website are accurate, complete, or current. We may make changes
            to the materials contained on our website at any time without notice.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">7. Links</h2>
          <p className="mb-4">
            DateThinker has not reviewed all of the sites linked to its website and is not responsible for the contents
            of any such linked site. The inclusion of any link does not imply endorsement by us of the site. Use of any
            such linked website is at the user's own risk.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">8. Modifications</h2>
          <p className="mb-4">
            We may revise these terms of service for our website at any time without notice. By using this website, you
            are agreeing to be bound by the then current version of these terms of service.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">9. Governing Law</h2>
          <p className="mb-4">
            These terms and conditions are governed by and construed in accordance with the laws of the United States,
            and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">10. Contact Us</h2>
          <p className="mb-4">If you have any questions about these Terms of Service, please contact us at:</p>
          <p className="mb-4">Email: terms@datethinker.com</p>
        </div>
      </div>
    </div>
  )
}

