import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Book, Code, Key, Zap } from "lucide-react";

export default function Docs() {
  const sections = [
    {
      title: "Getting Started",
      icon: Zap,
      topics: [
        "Quick Start Guide",
        "Installation",
        "Your First Verification",
        "Authentication"
      ]
    },
    {
      title: "API Reference",
      icon: Code,
      topics: [
        "Verification Endpoint",
        "Request Format",
        "Response Format",
        "Error Handling"
      ]
    },
    {
      title: "SDK & Libraries",
      icon: Code,
      topics: [
        "JavaScript/TypeScript",
        "Python",
        "React Components",
        "REST API"
      ]
    },
    {
      title: "Guides",
      icon: Book,
      topics: [
        "Best Practices",
        "Security Guidelines",
        "Rate Limiting",
        "Webhooks"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      
      <div className="pt-32 md:pt-36 pb-20">
        {/* Hero Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <Book className="w-20 h-20 text-neon-green mx-auto mb-6" />
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-black to-neon-green/80 bg-clip-text text-transparent">
                Documentation
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-black/70 mb-12">
              Everything you need to integrate VoiceID
            </p>
          </div>
        </section>

        {/* Quick Start */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 border-2 border-neon-green/20 mb-8">
              <h2 className="text-3xl font-bold mb-6">Quick Start</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">1. Get Your API Key</h3>
                  <p className="text-black/70 mb-3">
                    Sign up for a free account and get 1,000 free verifications.
                  </p>
                  <a 
                    href="/#api-key" 
                    className="text-neon-green hover:underline font-semibold"
                    onClick={(e) => {
                      if (window.location.pathname !== "/") {
                        window.location.href = "/#api-key";
                      } else {
                        e.preventDefault();
                        const element = document.querySelector("#api-key");
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth" });
                        }
                      }
                    }}
                  >
                    Get API Key →
                  </a>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">2. Install the SDK</h3>
                  <pre className="bg-black/5 p-4 rounded text-sm overflow-x-auto">
                    <code>npm install @voiceid/sdk</code>
                  </pre>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">3. Verify a Voice</h3>
                  <pre className="bg-black/5 p-4 rounded text-sm overflow-x-auto">
                    <code>{`import { VoiceID } from '@voiceid/sdk';

const vlo = new VoiceID(apiKey);
const result = await vlo.verify(audioBlob);

if (result.isHuman) {
  console.log('Human verified!');
}`}</code>
                  </pre>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Documentation Sections */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-black/5">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Documentation Sections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <Card key={section.title} className="p-6 border-2 border-neon-green/20 hover-elevate">
                    <Icon className="w-8 h-8 text-neon-green mb-4" />
                    <h3 className="text-2xl font-bold mb-4">{section.title}</h3>
                    <ul className="space-y-2">
                      {section.topics.map((topic) => (
                        <li key={topic} className="flex items-center gap-2 text-black/70">
                          <span className="w-1.5 h-1.5 bg-neon-green rounded-full"></span>
                          <span className="text-black/70">{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* API Key Help */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 border-2 border-neon-green/20">
              <div className="flex items-start gap-4">
                <Key className="w-12 h-12 text-neon-green flex-shrink-0" />
                <div>
                  <h2 className="text-2xl font-bold mb-4">Need an API Key?</h2>
                  <p className="text-black/70 mb-6">
                    Get started with 1,000 free verifications. No credit card required.
                  </p>
                  <a 
                    href="/#api-key"
                    onClick={(e) => {
                      if (window.location.pathname !== "/") {
                        window.location.href = "/#api-key";
                      } else {
                        e.preventDefault();
                        const element = document.querySelector("#api-key");
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth" });
                        }
                      }
                    }}
                  >
                    <button className="bg-neon-green text-black border-neon-green font-bold px-6 py-3 rounded-md hover:bg-emerald-500 transition-colors">
                      Get Your API Key
                    </button>
                  </a>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

