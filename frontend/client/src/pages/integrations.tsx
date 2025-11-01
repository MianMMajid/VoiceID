import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Code, Zap, Link as LinkIcon } from "lucide-react";

export default function Integrations() {
  const integrations = [
    {
      name: "JavaScript/TypeScript",
      description: "Official SDK for Node.js and browser environments",
      icon: Code,
      status: "Available",
      docs: "https://docs.voiceid.tech/js"
    },
    {
      name: "Python",
      description: "Python SDK for server-side and CLI applications",
      icon: Code,
      status: "Available",
      docs: "https://docs.voiceid.tech/python"
    },
    {
      name: "REST API",
      description: "Universal REST API works with any language",
      icon: LinkIcon,
      status: "Available",
      docs: "https://docs.voiceid.tech/api"
    },
    {
      name: "React",
      description: "React components for easy frontend integration",
      icon: Zap,
      status: "Available",
      docs: "https://docs.voiceid.tech/react"
    },
    {
      name: "Firebase",
      description: "Firebase Cloud Functions integration",
      icon: Zap,
      status: "Coming Soon",
      docs: null
    },
    {
      name: "AWS Lambda",
      description: "Serverless function integration for AWS",
      icon: Zap,
      status: "Coming Soon",
      docs: null
    }
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      
      <div className="pt-32 md:pt-36 pb-20">
        {/* Hero Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-black to-neon-green/80 bg-clip-text text-transparent">
                Integrations
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-black/70 mb-12">
              Integrate VoiceID with your favorite tools and platforms
            </p>
          </div>
        </section>

        {/* Integrations Grid */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map((integration) => {
                const Icon = integration.icon;
                return (
                  <Card key={integration.name} className="p-6 border-2 border-neon-green/20 hover-elevate">
                    <Icon className="w-8 h-8 text-neon-green mb-4" />
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold">{integration.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        integration.status === "Available" 
                          ? "bg-neon-green/10 text-neon-green" 
                          : "bg-black/10 text-black/60"
                      }`}>
                        {integration.status}
                      </span>
                    </div>
                    <p className="text-black/70 mb-4 text-sm">{integration.description}</p>
                    {integration.docs && (
                      <a 
                        href={integration.docs}
                        className="text-neon-green hover:underline text-sm font-semibold"
                      >
                        View Docs →
                      </a>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-black/5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">Quick Start</h2>
            <Card className="p-8 border-2 border-neon-green/20">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-3">1. Install SDK</h3>
                  <pre className="bg-black/5 p-4 rounded text-sm overflow-x-auto">
                    <code>npm install @voiceid/sdk</code>
                  </pre>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3">2. Initialize</h3>
                  <pre className="bg-black/5 p-4 rounded text-sm overflow-x-auto">
                    <code>{`import { VoiceID } from '@voiceid/sdk';

const vlo = new VoiceID(apiKey);`}</code>
                  </pre>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3">3. Verify Voice</h3>
                  <pre className="bg-black/5 p-4 rounded text-sm overflow-x-auto">
                    <code>{`const result = await vlo.verify(audioBlob);

if (result.isHuman) {
  // Allow access
}`}</code>
                  </pre>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Need Help Integrating?</h2>
            <p className="text-xl text-black/70 mb-8">
              Check out our full documentation or contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/docs">
                <button className="bg-neon-green text-black border-neon-green font-bold px-8 py-3 rounded-md hover:bg-emerald-500 transition-colors">
                  View Documentation
                </button>
              </Link>
              <a href="mailto:support@voiceid.tech">
                <button className="border-2 border-neon-green text-neon-green font-bold px-8 py-3 rounded-md hover:bg-neon-green hover:text-black transition-colors">
                  Contact Support
                </button>
              </a>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

