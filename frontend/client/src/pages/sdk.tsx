import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Code, Package, Terminal } from "lucide-react";

export default function SDK() {
  const sdks = [
    {
      name: "JavaScript/TypeScript",
      description: "Official SDK for Node.js and browser environments",
      install: "npm install @voiceid/sdk",
      code: `import { VoiceID } from '@voiceid/sdk';

const vlo = new VoiceID(apiKey);
const result = await vlo.verify(audioBlob);

if (result.isHuman) {
  console.log('Human verified!');
}`
    },
    {
      name: "Python",
      description: "Python SDK for server-side applications",
      install: "pip install voiceid-sdk",
      code: `from voiceid import VoiceID

vlo = VoiceID(api_key)
result = vlo.verify(audio_blob)

if result.is_human:
    print('Human verified!')`
    },
    {
      name: "REST API",
      description: "Use our REST API directly with any language",
      install: "No installation needed",
      code: `curl https://api.voiceid.tech/v1/verify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "audio=@recording.wav"`
    }
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      
      <div className="pt-32 md:pt-36 pb-20">
        {/* Hero Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <Package className="w-20 h-20 text-neon-green mx-auto mb-6" />
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-black to-neon-green/80 bg-clip-text text-transparent">
                SDK & Libraries
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-black/70 mb-12">
              Official SDKs and libraries for popular languages
            </p>
          </div>
        </section>

        {/* SDK Cards */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="space-y-8">
              {sdks.map((sdk) => (
                <Card key={sdk.name} className="p-8 border-2 border-neon-green/20 hover-elevate">
                  <div className="flex items-start gap-4 mb-6">
                    <Code className="w-8 h-8 text-neon-green flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2">{sdk.name}</h3>
                      <p className="text-black/70 mb-4">{sdk.description}</p>
                      
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Installation</h4>
                        <pre className="bg-black/5 p-3 rounded text-sm overflow-x-auto">
                          <code>{sdk.install}</code>
                        </pre>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Example Usage</h4>
                        <pre className="bg-black/5 p-4 rounded text-sm overflow-x-auto">
                          <code>{sdk.code}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-black/5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">SDK Features</h2>
            <Card className="p-8 border-2 border-neon-green/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Terminal className="w-6 h-6 text-neon-green mb-2" />
                  <h3 className="font-bold mb-2">Type Safety</h3>
                  <p className="text-sm text-black/70">
                    Full TypeScript support with complete type definitions
                  </p>
                </div>
                <div>
                  <Terminal className="w-6 h-6 text-neon-green mb-2" />
                  <h3 className="font-bold mb-2">Error Handling</h3>
                  <p className="text-sm text-black/70">
                    Built-in error handling with detailed error messages
                  </p>
                </div>
                <div>
                  <Terminal className="w-6 h-6 text-neon-green mb-2" />
                  <h3 className="font-bold mb-2">Retry Logic</h3>
                  <p className="text-sm text-black/70">
                    Automatic retry with exponential backoff for failed requests
                  </p>
                </div>
                <div>
                  <Terminal className="w-6 h-6 text-neon-green mb-2" />
                  <h3 className="font-bold mb-2">Documentation</h3>
                  <p className="text-sm text-black/70">
                    Comprehensive documentation and code examples
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* React Components */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">React Components</h2>
            <Card className="p-8 border-2 border-neon-green/20">
              <p className="text-black/80 mb-4">
                We also provide React components for easy frontend integration:
              </p>
              <pre className="bg-black/5 p-4 rounded text-sm overflow-x-auto mb-4">
                <code>{`npm install @voiceid/react

import { VoiceRecorder } from '@voiceid/react';

function App() {
  return <VoiceRecorder apiKey={apiKey} />;
}`}</code>
              </pre>
              <Link href="/docs" className="text-neon-green hover:underline font-semibold">
                View React Documentation →
              </Link>
            </Card>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

