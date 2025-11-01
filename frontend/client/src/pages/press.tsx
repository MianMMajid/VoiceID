import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Download, FileText, Image, Video, Mail } from "lucide-react";

export default function Press() {
  const pressAssets = [
    {
      title: "Company Logo",
      description: "High-resolution logo files in PNG and SVG formats",
      icon: Image,
      files: ["Logo (PNG)", "Logo (SVG)", "Logo (Dark Mode)"]
    },
    {
      title: "Product Screenshots",
      description: "UI screenshots and API integration examples",
      icon: Image,
      files: ["Dashboard", "API Console", "Integration Examples"]
    },
    {
      title: "Press Release Template",
      description: "Latest press releases and announcements",
      icon: FileText,
      files: ["Launch Announcement", "Funding Round", "Product Updates"]
    },
    {
      title: "Video Assets",
      description: "Product demos and explainer videos",
      icon: Video,
      files: ["Product Demo", "How It Works", "Customer Testimonials"]
    }
  ];

  const facts = [
    { label: "Accuracy Rate", value: "99.8%" },
    { label: "Bot Reduction", value: "98%" },
    { label: "Verification Time", value: "<10s" },
    { label: "Cost per Verification", value: "$0.01" },
    { label: "Free Tier", value: "1,000 verifications" }
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
                Press Kit
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-black/70 mb-12">
              Everything you need to write about VoiceID
            </p>
          </div>
        </section>

        {/* Quick Facts */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 bg-black/5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">Quick Facts</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {facts.map((fact) => (
                <Card key={fact.label} className="p-4 text-center border-2 border-neon-green/20">
                  <div className="text-2xl font-bold text-neon-green mb-1">{fact.value}</div>
                  <div className="text-sm text-black/60">{fact.label}</div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">About VoiceID</h2>
            <Card className="p-8 border-2 border-neon-green/20">
              <p className="text-lg text-black/80 leading-relaxed mb-4">
                VoiceID is a voice-based bot verification API that eliminates 98% of bots in under 10 seconds. 
                Using advanced AI voice biometrics from ElevenLabs, SpeechBrain, and OpenAI Whisper, 
                VoiceID analyzes voice patterns to detect humans vs. bots and deepfakes with 99.8% accuracy.
              </p>
              <p className="text-lg text-black/80 leading-relaxed mb-4">
                Founded in 2024, VoiceID provides a simple, cost-effective alternative to traditional CAPTCHA 
                systems. Developers can integrate VoiceID with just 3 lines of code, and pricing starts at 
                $0.01 per verification with a free tier of 1,000 verifications.
              </p>
              <p className="text-lg text-black/80 leading-relaxed">
                VoiceID is backed by Y Combinator and trusted by hundreds of companies to protect their 
                platforms from bot fraud.
              </p>
            </Card>
          </div>
        </section>

        {/* Press Assets */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-black/5">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Press Assets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pressAssets.map((asset) => {
                const Icon = asset.icon;
                return (
                  <Card key={asset.title} className="p-6 border-2 border-neon-green/20 hover-elevate">
                    <Icon className="w-8 h-8 text-neon-green mb-4" />
                    <h3 className="text-xl font-bold mb-2">{asset.title}</h3>
                    <p className="text-black/70 mb-4">{asset.description}</p>
                    <div className="space-y-2 mb-4">
                      {asset.files.map((file) => (
                        <div key={file} className="flex items-center justify-between text-sm">
                          <span className="text-black/60">{file}</span>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-8">Press Inquiries</h2>
            <Card className="p-8 border-2 border-neon-green/20 inline-block">
              <Mail className="w-12 h-12 text-neon-green mx-auto mb-4" />
              <p className="text-lg text-black/70 mb-6">
                For press inquiries, interviews, or media requests, please contact us at:
              </p>
              <a 
                href="mailto:press@voiceid.tech" 
                className="text-2xl font-bold text-neon-green hover:underline"
              >
                press@voiceid.tech
              </a>
            </Card>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

