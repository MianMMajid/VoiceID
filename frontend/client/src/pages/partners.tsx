import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Handshake, Code, Zap, Shield, Mail } from "lucide-react";

export default function Partners() {
  const partnerTypes = [
    {
      title: "Integration Partners",
      description: "Platforms and services that integrate VoiceID directly into their offerings",
      icon: Code,
      examples: ["Auth providers", "Payment processors", "CRM platforms"]
    },
    {
      title: "Technology Partners",
      description: "Companies we collaborate with to enhance our voice verification technology",
      icon: Zap,
      examples: ["AI/ML platforms", "Voice processing services", "Security providers"]
    },
    {
      title: "Channel Partners",
      description: "Resellers and agencies that offer VoiceID to their clients",
      icon: Handshake,
      examples: ["Dev agencies", "Security consultants", "SaaS platforms"]
    }
  ];

  const benefits = [
    "Revenue sharing opportunities",
    "Co-marketing support",
    "Technical integration assistance",
    "Dedicated partner success manager",
    "Early access to new features",
    "Priority support"
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
                Partner With Us
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-black/70 mb-12">
              Join our ecosystem and help businesses eliminate bot fraud
            </p>
          </div>
        </section>

        {/* Partner Types */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Partnership Opportunities</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {partnerTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card key={type.title} className="p-8 border-2 border-neon-green/20 hover-elevate">
                    <Icon className="w-12 h-12 text-neon-green mb-4" />
                    <h3 className="text-2xl font-bold mb-4">{type.title}</h3>
                    <p className="text-black/70 mb-4">{type.description}</p>
                    <ul className="space-y-2">
                      {type.examples.map((example) => (
                        <li key={example} className="text-sm text-black/60 flex items-center">
                          <span className="w-2 h-2 bg-neon-green rounded-full mr-2"></span>
                          {example}
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-black/5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">Partner Benefits</h2>
            <Card className="p-8 border-2 border-neon-green/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-neon-green flex-shrink-0" />
                    <span className="text-black/80">{benefit}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-8">Ready to Partner?</h2>
            <Card className="p-8 border-2 border-neon-green/20 inline-block">
              <p className="text-lg text-black/70 mb-6">
                Let's discuss how we can work together to eliminate bot fraud.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  className="bg-neon-green text-black border-neon-green font-semibold hover:bg-emerald-500"
                  asChild
                >
                  <a href="mailto:partners@voiceid.tech">
                    <Mail className="w-5 h-5 mr-2" />
                    Contact Partnership Team
                  </a>
                </Button>
                <Button 
                  variant="outline"
                  className="border-neon-green text-neon-green hover:bg-neon-green hover:text-black"
                >
                  View Partnership Program Details
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

