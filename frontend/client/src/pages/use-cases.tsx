import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Shield, ShoppingCart, Users, Lock, Mic, CreditCard } from "lucide-react";

export default function UseCases() {
  const useCases = [
    {
      icon: ShoppingCart,
      title: "E-commerce",
      description: "Prevent bot accounts from creating fake orders, claiming promotions, and skewing analytics.",
      benefits: ["Reduce fraudulent orders", "Protect promotions", "Accurate analytics"]
    },
    {
      icon: Users,
      title: "User Registration",
      description: "Verify real users during account creation without frustrating CAPTCHA challenges.",
      benefits: ["Higher conversion rates", "Better user experience", "Fewer fake accounts"]
    },
    {
      icon: Lock,
      title: "Account Security",
      description: "Add an extra layer of security for password resets, sensitive transactions, and login attempts.",
      benefits: ["Prevent account takeover", "Secure password resets", "Two-factor authentication"]
    },
    {
      icon: Mic,
      title: "Content Moderation",
      description: "Verify that content creators are real humans before allowing uploads or comments.",
      benefits: ["Reduce spam content", "Prevent bot comments", "Maintain platform quality"]
    },
    {
      icon: CreditCard,
      title: "Financial Services",
      description: "Protect financial transactions, loan applications, and high-value operations.",
      benefits: ["Prevent fraud", "Comply with regulations", "Protect sensitive operations"]
    },
    {
      icon: Shield,
      title: "API Protection",
      description: "Rate limit APIs with voice verification to prevent bot abuse and scraping.",
      benefits: ["Prevent API abuse", "Fair resource allocation", "Cost control"]
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
                Use Cases
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-black/70 mb-12">
              Protect your business from bots across every touchpoint
            </p>
          </div>
        </section>

        {/* Use Cases Grid */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {useCases.map((useCase) => {
                const Icon = useCase.icon;
                return (
                  <Card key={useCase.title} className="p-8 border-2 border-neon-green/20 hover-elevate">
                    <Icon className="w-12 h-12 text-neon-green mb-4" />
                    <h3 className="text-2xl font-bold mb-4">{useCase.title}</h3>
                    <p className="text-black/70 mb-6">{useCase.description}</p>
                    <div>
                      <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide">Key Benefits:</h4>
                      <ul className="space-y-2">
                        {useCase.benefits.map((benefit) => (
                          <li key={benefit} className="flex items-center gap-2 text-sm text-black/70">
                            <span className="w-1.5 h-1.5 bg-neon-green rounded-full"></span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Integration CTA */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-black/5">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-black/70 mb-8">
              Integrate VoiceID in 3 lines of code and start protecting your platform today.
            </p>
            <Link href="/docs" className="inline-block">
              <button className="bg-neon-green text-black border-neon-green font-bold px-8 py-3 rounded-md hover:bg-emerald-500 transition-colors">
                View Documentation
              </button>
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

