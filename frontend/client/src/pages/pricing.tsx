import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Check, Zap, Shield, Rocket } from "lucide-react";

export default function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "Forever",
      description: "Perfect for testing and small projects",
      features: [
        "1,000 verifications/month",
        "99.8% accuracy",
        "<10s verification time",
        "API access",
        "Email support",
        "Community access"
      ],
      cta: "Get Started Free",
      popular: false
    },
    {
      name: "Starter",
      price: "$0.01",
      period: "per verification",
      description: "Ideal for growing businesses",
      features: [
        "Pay as you go",
        "No monthly minimum",
        "All Free features",
        "Priority support",
        "Custom integration help",
        "Usage analytics"
      ],
      cta: "Start Paying",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "For high-volume and custom needs",
      features: [
        "Volume discounts",
        "Dedicated support",
        "SLA guarantees",
        "Custom integrations",
        "On-premise options",
        "Account manager"
      ],
      cta: "Contact Sales",
      popular: false
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
                Simple, Transparent Pricing
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-black/70 mb-12">
              Start free, scale as you grow
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <Card 
                  key={plan.name} 
                  className={`p-8 border-2 ${plan.popular ? 'border-neon-green shadow-glow-neon' : 'border-neon-green/20'} relative hover-elevate`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-neon-green text-black px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <div className="mb-2">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.period && (
                        <span className="text-black/60 ml-2">{plan.period}</span>
                      )}
                    </div>
                    <p className="text-black/60 text-sm">{plan.description}</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-neon-green flex-shrink-0 mt-0.5" />
                        <span className="text-black/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-neon-green text-black border-neon-green hover:bg-emerald-500' : 'border-2 border-neon-green text-neon-green hover:bg-neon-green hover:text-black'}`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-black/5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <Card className="p-6 border-2 border-neon-green/20">
                <h3 className="text-xl font-bold mb-2">Do unused verifications roll over?</h3>
                <p className="text-black/70">
                  No, unused verifications in the free tier do not roll over. Paid plans are charged per verification used.
                </p>
              </Card>
              <Card className="p-6 border-2 border-neon-green/20">
                <h3 className="text-xl font-bold mb-2">Are there any setup fees?</h3>
                <p className="text-black/70">
                  No setup fees. Start with the free tier and upgrade when you're ready. No credit card required for the free tier.
                </p>
              </Card>
              <Card className="p-6 border-2 border-neon-green/20">
                <h3 className="text-xl font-bold mb-2">Can I cancel anytime?</h3>
                <p className="text-black/70">
                  Yes, you can cancel at any time. With the pay-as-you-go Starter plan, you only pay for what you use.
                </p>
              </Card>
              <Card className="p-6 border-2 border-neon-green/20">
                <h3 className="text-xl font-bold mb-2">Do you offer volume discounts?</h3>
                <p className="text-black/70">
                  Yes, Enterprise plans include volume discounts for high-volume usage. Contact our sales team for custom pricing.
                </p>
              </Card>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

