import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Code, Terminal } from "lucide-react";

export default function APIReference() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      
      <div className="pt-32 md:pt-36 pb-20">
        {/* Hero Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <Code className="w-20 h-20 text-neon-green mx-auto mb-6" />
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-black to-neon-green/80 bg-clip-text text-transparent">
                API Reference
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-black/70 mb-12">
              Complete API documentation for VoiceID
            </p>
          </div>
        </section>

        {/* Base URL */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 border-2 border-neon-green/20 mb-8">
              <h2 className="text-2xl font-bold mb-4">Base URL</h2>
              <pre className="bg-black/5 p-4 rounded text-sm overflow-x-auto">
                <code>https://api.voiceid.tech/v1</code>
              </pre>
            </Card>
          </div>
        </section>

        {/* Authentication */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-black/5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8">Authentication</h2>
            <Card className="p-8 border-2 border-neon-green/20">
              <p className="text-black/80 mb-4">
                All API requests require authentication using your API key. Include it in the Authorization header:
              </p>
              <pre className="bg-black/5 p-4 rounded text-sm overflow-x-auto mb-4">
                <code>Authorization: Bearer YOUR_API_KEY</code>
              </pre>
              <p className="text-sm text-black/60">
                Get your API key from the{" "}
                <a 
                  href="/#api-key" 
                  className="text-neon-green hover:underline"
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
                  dashboard
                </a>.
              </p>
            </Card>
          </div>
        </section>

        {/* Verify Endpoint */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8">Verify Voice</h2>
            <Card className="p-8 border-2 border-neon-green/20 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-5 h-5 text-neon-green" />
                <span className="font-mono font-semibold">POST /verify</span>
              </div>
              <p className="text-black/80 mb-6">
                Verify if a voice recording is from a human or a bot.
              </p>
              
              <h3 className="text-xl font-bold mb-3">Request</h3>
              <pre className="bg-black/5 p-4 rounded text-sm overflow-x-auto mb-6">
                <code>{`curl https://api.voiceid.tech/v1/verify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "audio=@recording.wav"`}</code>
              </pre>

              <h3 className="text-xl font-bold mb-3">Request Body</h3>
              <div className="bg-black/5 p-4 rounded text-sm mb-6">
                <p className="font-semibold mb-2">Form Data:</p>
                <ul className="list-disc pl-6 space-y-1 text-black/70">
                  <li><code>audio</code> (file, required): Audio file in WAV, MP3, or WebM format</li>
                  <li><code>phrase</code> (string, optional): Expected phrase (for phrase-based verification)</li>
                </ul>
              </div>

              <h3 className="text-xl font-bold mb-3">Response</h3>
              <pre className="bg-black/5 p-4 rounded text-sm overflow-x-auto mb-4">
                <code>{`{
  "isHuman": true,
  "confidence": 0.998,
  "processingTime": 8.5,
  "verificationId": "ver_abc123",
  "timestamp": "2024-01-15T10:30:00Z"
}`}</code>
              </pre>

              <h3 className="text-xl font-bold mb-3 mt-6">Response Fields</h3>
              <div className="space-y-2 text-sm">
                <div className="flex gap-4">
                  <code className="font-semibold w-32">isHuman</code>
                  <span className="text-black/70">boolean - true if human, false if bot</span>
                </div>
                <div className="flex gap-4">
                  <code className="font-semibold w-32">confidence</code>
                  <span className="text-black/70">number (0-1) - confidence score</span>
                </div>
                <div className="flex gap-4">
                  <code className="font-semibold w-32">processingTime</code>
                  <span className="text-black/70">number - processing time in seconds</span>
                </div>
                <div className="flex gap-4">
                  <code className="font-semibold w-32">verificationId</code>
                  <span className="text-black/70">string - unique verification ID</span>
                </div>
                <div className="flex gap-4">
                  <code className="font-semibold w-32">timestamp</code>
                  <span className="text-black/70">string - ISO 8601 timestamp</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Error Handling */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-black/5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8">Error Handling</h2>
            <Card className="p-8 border-2 border-neon-green/20">
              <p className="text-black/80 mb-6">
                The API uses standard HTTP status codes. Errors return a JSON object with an error message:
              </p>
              <pre className="bg-black/5 p-4 rounded text-sm overflow-x-auto mb-6">
                <code>{`{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid",
    "statusCode": 401
  }
}`}</code>
              </pre>
              
              <h3 className="text-xl font-bold mb-3">Common Error Codes</h3>
              <div className="space-y-2 text-sm">
                <div className="flex gap-4">
                  <code className="font-semibold w-48">INVALID_API_KEY</code>
                  <span className="text-black/70">401 - Invalid or missing API key</span>
                </div>
                <div className="flex gap-4">
                  <code className="font-semibold w-48">INVALID_AUDIO</code>
                  <span className="text-black/70">400 - Invalid audio format or corrupted file</span>
                </div>
                <div className="flex gap-4">
                  <code className="font-semibold w-48">RATE_LIMIT_EXCEEDED</code>
                  <span className="text-black/70">429 - Too many requests</span>
                </div>
                <div className="flex gap-4">
                  <code className="font-semibold w-48">QUOTA_EXCEEDED</code>
                  <span className="text-black/70">403 - Free tier quota exceeded</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Rate Limiting */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8">Rate Limiting</h2>
            <Card className="p-8 border-2 border-neon-green/20">
              <p className="text-black/80 mb-4">
                API requests are rate-limited based on your plan:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-black/70 mb-4">
                <li><strong>Free:</strong> 100 requests per minute</li>
                <li><strong>Starter:</strong> 1,000 requests per minute</li>
                <li><strong>Enterprise:</strong> Custom limits</li>
              </ul>
              <p className="text-black/80">
                Rate limit information is included in response headers: <code className="bg-black/5 px-1 rounded">X-RateLimit-Remaining</code>
              </p>
            </Card>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

