import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Cookie } from "lucide-react";

export default function Cookies() {
  const cookieTypes = [
    {
      name: "Essential Cookies",
      purpose: "Required for the website to function",
      duration: "Session",
      examples: ["Authentication", "Security", "Session management"]
    },
    {
      name: "Analytics Cookies",
      purpose: "Help us understand how visitors use our site",
      duration: "2 years",
      examples: ["Page views", "User interactions", "Performance metrics"]
    },
    {
      name: "Functional Cookies",
      purpose: "Remember your preferences and settings",
      duration: "1 year",
      examples: ["Language preferences", "Theme settings", "API key storage"]
    }
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      
      <div className="pt-32 md:pt-36 pb-20">
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Cookie className="w-16 h-16 text-neon-green mx-auto mb-4" />
              <h1 className="text-5xl sm:text-6xl font-bold mb-4">
                Cookie Policy
              </h1>
              <p className="text-black/60">Last updated: {new Date().toLocaleDateString()}</p>
            </div>

            <Card className="p-8 border-2 border-neon-green/20 mb-8">
              <h2 className="text-2xl font-bold mb-4">What Are Cookies?</h2>
              <p className="text-black/80 mb-4">
                Cookies are small text files stored on your device when you visit a website. They help websites 
                remember your preferences and improve your experience.
              </p>
            </Card>

            <Card className="p-8 border-2 border-neon-green/20 mb-8">
              <h2 className="text-2xl font-bold mb-6">How We Use Cookies</h2>
              <div className="space-y-6">
                {cookieTypes.map((type) => (
                  <div key={type.name} className="border-l-4 border-neon-green pl-4">
                    <h3 className="text-xl font-semibold mb-2">{type.name}</h3>
                    <p className="text-black/70 mb-2">{type.purpose}</p>
                    <p className="text-sm text-black/60 mb-2">Duration: {type.duration}</p>
                    <ul className="list-disc pl-6 space-y-1">
                      {type.examples.map((example) => (
                        <li key={example} className="text-sm text-black/60">{example}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 border-2 border-neon-green/20 mb-8">
              <h2 className="text-2xl font-bold mb-4">Managing Cookies</h2>
              <p className="text-black/80 mb-4">
                You can control cookies through your browser settings. Note that disabling cookies may affect 
                the functionality of our website.
              </p>
              <p className="text-black/80">
                Most browsers allow you to:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>View and delete cookies</li>
                <li>Block cookies from specific sites</li>
                <li>Block all cookies</li>
                <li>Clear cookies when you close your browser</li>
              </ul>
            </Card>

            <Card className="p-8 border-2 border-neon-green/20">
              <h2 className="text-2xl font-bold mb-4">Third-Party Cookies</h2>
              <p className="text-black/80 mb-4">
                We use third-party services that may set cookies on your device:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Analytics providers (to understand usage)</li>
                <li>Payment processors (to handle transactions)</li>
                <li>Cloud service providers (to deliver our API)</li>
              </ul>
              <p className="text-black/80 mt-4">
                These third parties have their own privacy policies governing cookie use.
              </p>
            </Card>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

