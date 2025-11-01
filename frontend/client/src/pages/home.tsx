import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Mic, CheckCircle, Skull, Bot, DollarSign, Frown, Code, Zap, Shield } from "lucide-react";
import { SignupModal } from "@/components/signup-modal";
import { VoiceRecorder } from "@/components/voice-recorder";
import { AnimatedCounter } from "@/components/animated-counter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function Home() {
  const [signupOpen, setSignupOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowStats(true);
        }
      },
      { threshold: 0.3 }
    );

    const element = document.getElementById("problem");
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Navbar */}
      <Navbar onGetApiKey={() => setSignupOpen(true)} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20 pt-32 md:pt-36">
        <div className="max-w-7xl mx-auto w-full text-center">
          {/* Live API Badge */}
          <Badge 
            className="mb-8 px-6 py-2 text-sm font-semibold border-2 border-neon-green/20 bg-neon-green/5 text-black hover-elevate"
            data-testid="badge-live-api"
          >
            <Mic className="w-4 h-4 mr-2 inline" />
            Live API • Voice Verification
          </Badge>

          {/* Massive Hero Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-7xl font-bold leading-none mb-8" data-testid="text-hero-headline">
            <span className="bg-gradient-to-r from-black to-neon-green/80 bg-clip-text text-transparent">
              VoiceID
            </span>
            <br />
            <span className="bg-gradient-to-r from-neon-green to-emerald-500 bg-clip-text text-transparent">
              Kills 98%
            </span>
            <br />
            <span className="bg-gradient-to-r from-black to-neon-green/80 bg-clip-text text-transparent">
              Bots in 10s
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl lg:text-3xl text-black/80 mb-12 max-w-4xl mx-auto font-medium" data-testid="text-hero-subtitle">
            Voice-based verification that's 99.8% accurate, deepfake-proof, and costs just $0.01 per pass
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              size="lg"
              className="bg-neon-green text-black border-neon-green font-bold text-lg"
              onClick={() => scrollToSection('api-key')}
              data-testid="button-start-free"
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Free - 1k Verifications
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-2 border-neon-green text-black font-bold text-lg"
              onClick={() => scrollToSection('how')}
              data-testid="button-watch-demo"
            >
              Watch Demo
            </Button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
            <Card className="p-8 bg-white border-2 border-neon-green/20 shadow-glow-neon hover:shadow-glow-neon-strong transition-all duration-300 hover:scale-[1.02] hover-elevate" data-testid="card-metric-accuracy">
              <div className="text-6xl lg:text-7xl font-bold text-neon-green mb-2">99.8%</div>
              <div className="text-lg font-semibold text-black/70">Accuracy Rate</div>
            </Card>
            <Card className="p-8 bg-white border-2 border-neon-green/20 shadow-glow-neon hover:shadow-glow-neon-strong transition-all duration-300 hover:scale-[1.02] hover-elevate" data-testid="card-metric-reduction">
              <div className="text-6xl lg:text-7xl font-bold text-neon-green mb-2">-98%</div>
              <div className="text-lg font-semibold text-black/70">Bot Reduction</div>
            </Card>
            <Card className="p-8 bg-white border-2 border-neon-green/20 shadow-glow-neon hover:shadow-glow-neon-strong transition-all duration-300 hover:scale-[1.02] hover-elevate" data-testid="card-metric-speed">
              <div className="text-6xl lg:text-7xl font-bold text-neon-green mb-2">&lt;10s</div>
              <div className="text-lg font-semibold text-black/70">Verification Time</div>
            </Card>
          </div>

          {/* Interactive Voice Demo */}
          <VoiceRecorder />
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-black/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-center mb-16" data-testid="text-problem-heading">
            The Bot Apocalypse
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <Card className="p-8 text-center hover-elevate" data-testid="card-stat-bots">
              <Bot className="w-16 h-16 text-neon-green mx-auto mb-4" />
              <div className="text-5xl font-bold text-black mb-2">
                {showStats ? (
                  <AnimatedCounter end={60} suffix="%" duration={2000} testId="counter-bots" />
                ) : (
                  "0%"
                )}
              </div>
              <div className="text-xl font-semibold text-black/70">Of internet traffic is bots</div>
            </Card>
            <Card className="p-8 text-center hover-elevate" data-testid="card-stat-fraud">
              <DollarSign className="w-16 h-16 text-neon-green mx-auto mb-4" />
              <div className="text-5xl font-bold text-black mb-2">
                {showStats ? (
                  <AnimatedCounter end={200} prefix="$" suffix="B" duration={2500} testId="counter-fraud" />
                ) : (
                  "$0B"
                )}
              </div>
              <div className="text-xl font-semibold text-black/70">Lost to fraud annually</div>
            </Card>
            <Card className="p-8 text-center hover-elevate" data-testid="card-stat-captcha">
              <Frown className="w-16 h-16 text-neon-green mx-auto mb-4" />
              <div className="text-5xl font-bold text-black mb-2">
                {showStats ? (
                  <AnimatedCounter end={73} suffix="%" duration={2000} testId="counter-captcha" />
                ) : (
                  "0%"
                )}
              </div>
              <div className="text-xl font-semibold text-black/70">CAPTCHA abandonment rate</div>
            </Card>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <Skull className="w-32 h-32 text-neon-green" data-testid="icon-skull" />
              <div className="absolute inset-0 bg-neon-green/20 blur-3xl rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-center mb-8" data-testid="text-how-heading">
            3 Lines of Code
          </h2>
          <p className="text-xl sm:text-2xl text-black/70 text-center mb-16 max-w-3xl mx-auto">
            Integrate voice verification in minutes, not weeks
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="p-8 hover:shadow-glow-neon-strong transition-all duration-300 hover:scale-[1.02] border-2 border-neon-green/20 hover-elevate" data-testid="card-step-speak">
              <Mic className="w-16 h-16 text-neon-green mb-6 mx-auto" />
              <h3 className="text-2xl font-bold text-center mb-4">Speak</h3>
              <p className="text-lg text-black/70 text-center">
                User speaks a simple phrase into their device
              </p>
            </Card>
            <Card className="p-8 hover:shadow-glow-neon-strong transition-all duration-300 hover:scale-[1.02] border-2 border-neon-green/20 hover-elevate" data-testid="card-step-verify">
              <CheckCircle className="w-16 h-16 text-neon-green mb-6 mx-auto" />
              <h3 className="text-2xl font-bold text-center mb-4">Verify</h3>
              <p className="text-lg text-black/70 text-center">
                AI analyzes voice patterns and biometrics in real-time
              </p>
            </Card>
            <Card className="p-8 hover:shadow-glow-neon-strong transition-all duration-300 hover:scale-[1.02] border-2 border-neon-green/20 hover-elevate" data-testid="card-step-block">
              <Skull className="w-16 h-16 text-neon-green mb-6 mx-auto" />
              <h3 className="text-2xl font-bold text-center mb-4">Block Bots</h3>
              <p className="text-lg text-black/70 text-center">
                Bots and deepfakes are instantly rejected
              </p>
            </Card>
          </div>

          {/* Code Snippet */}
          <Card className="max-w-3xl mx-auto p-8 bg-white border-2 border-neon-green/30 shadow-sm" data-testid="card-code-example">
            <pre className="text-black font-mono text-sm sm:text-base overflow-x-auto">
              <code className="text-black">{`import { VoiceID } from '@voiceid/sdk';

const vlo = new VoiceID(apiKey);
const result = await vlo.verify(audioBlob);

if (result.isHuman) {
  // Allow access
} else {
  // Block bot
}`}</code>
            </pre>
          </Card>
        </div>
      </section>

      {/* Tech Stack Proof */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-black/5">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-lg text-black/50 font-medium" data-testid="text-powered-by">
            Powered by: <span className="font-semibold">ElevenLabs</span> | <span className="font-semibold">SpeechBrain</span> | <span className="font-semibold">Whisper</span> | <span className="font-semibold">Vercel</span> | <span className="font-semibold">Replit</span>
          </p>
        </div>
      </section>

      {/* Final CTA Section */}
      <section id="api-key" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6" data-testid="text-final-cta-heading">
            Ready to Kill Bots?
          </h2>
          <p className="text-2xl sm:text-3xl text-black/70 mb-12 font-semibold">
            1,000 Free Verifications. No Credit Card Required.
          </p>
          <Button 
            size="lg"
            className="bg-neon-green text-black border-neon-green font-bold text-2xl shadow-glow-neon-strong transition-all duration-300"
            onClick={() => setSignupOpen(true)}
            data-testid="button-get-api-key"
          >
            <Shield className="w-8 h-8 mr-3" />
            Get API Key
          </Button>
          <p className="mt-8 text-lg text-black/60">
            Questions? DM <a href="https://twitter.com/voiceid_tech" className="text-neon-green font-semibold hover:underline" data-testid="link-twitter">@voiceid_tech</a>
          </p>
        </div>
      </section>

      <SignupModal open={signupOpen} onOpenChange={setSignupOpen} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
