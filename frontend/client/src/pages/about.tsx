import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Mic, Shield, Zap, Users, Target } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      
      <div className="pt-32 md:pt-36 pb-20">
        {/* Hero Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-black to-neon-green/80 bg-clip-text text-transparent">
                About VoiceID
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-black/70 mb-12">
              We're building the future of bot protection through voice verification technology
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 bg-black/5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">Our Mission</h2>
            <Card className="p-8 border-2 border-neon-green/20">
              <p className="text-lg text-black/80 leading-relaxed mb-4">
                VoiceID was born from a simple observation: traditional bot detection methods are failing. 
                CAPTCHAs frustrate users, and sophisticated bots bypass them daily. We believe there's 
                a better way—using the one thing bots can't fake: a real human voice.
              </p>
              <p className="text-lg text-black/80 leading-relaxed">
                Our mission is to eliminate bot fraud while providing a seamless, fast, and delightful 
                user experience. We're committed to making the internet safer, one voice verification at a time.
              </p>
            </Card>
          </div>
        </section>

        {/* Values Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="p-8 border-2 border-neon-green/20 hover-elevate">
                <Zap className="w-12 h-12 text-neon-green mb-4" />
                <h3 className="text-2xl font-bold mb-4">Speed & Efficiency</h3>
                <p className="text-black/70">
                  We optimize for sub-10 second verifications because every moment counts. 
                  Your users deserve fast, frictionless experiences.
                </p>
              </Card>
              
              <Card className="p-8 border-2 border-neon-green/20 hover-elevate">
                <Shield className="w-12 h-12 text-neon-green mb-4" />
                <h3 className="text-2xl font-bold mb-4">Security First</h3>
                <p className="text-black/70">
                  We take data privacy seriously. All voice data is processed securely and 
                  never stored without explicit consent.
                </p>
              </Card>
              
              <Card className="p-8 border-2 border-neon-green/20 hover-elevate">
                <Target className="w-12 h-12 text-neon-green mb-4" />
                <h3 className="text-2xl font-bold mb-4">Accuracy Matters</h3>
                <p className="text-black/70">
                  99.8% accuracy isn't just a number—it's our commitment to reliable bot detection 
                  that your business can trust.
                </p>
              </Card>
              
              <Card className="p-8 border-2 border-neon-green/20 hover-elevate">
                <Users className="w-12 h-12 text-neon-green mb-4" />
                <h3 className="text-2xl font-bold mb-4">Developer Experience</h3>
                <p className="text-black/70">
                  Three lines of code. That's all it takes to integrate. We believe great tools 
                  should be simple to use.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-black/5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">The Technology</h2>
            <Card className="p-8 border-2 border-neon-green/20">
              <Mic className="w-16 h-16 text-neon-green mb-6 mx-auto" />
              <p className="text-lg text-black/80 leading-relaxed mb-4">
                VoiceID leverages cutting-edge AI models from ElevenLabs, SpeechBrain, and OpenAI Whisper 
                to analyze voice biometrics in real-time. Our proprietary spoof detection algorithms 
                identify deepfakes, text-to-speech bots, and synthetic voices with 99.8% accuracy.
              </p>
              <p className="text-lg text-black/80 leading-relaxed">
                Built for scale, designed for developers. Our API handles millions of verifications 
                daily while maintaining sub-10 second response times.
              </p>
            </Card>
          </div>
        </section>

        {/* Team CTA */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Join Us</h2>
            <p className="text-xl text-black/70 mb-8">
              We're always looking for talented people who share our vision. 
              Check out our <Link href="/careers" className="text-neon-green hover:underline font-semibold">careers page</Link>.
            </p>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

