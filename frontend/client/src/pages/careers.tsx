import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Code, Zap, Shield, Rocket, Users, Heart } from "lucide-react";

export default function Careers() {
  const openRoles = [
    {
      title: "Senior Backend Engineer",
      department: "Engineering",
      location: "Remote",
      icon: Code,
      description: "Build scalable API infrastructure and optimize our verification pipeline."
    },
    {
      title: "ML/AI Engineer",
      department: "Engineering",
      location: "Remote",
      icon: Rocket,
      description: "Improve our voice biometric algorithms and spoof detection models."
    },
    {
      title: "Developer Advocate",
      department: "Community",
      location: "Remote",
      icon: Users,
      description: "Help developers integrate VoiceID and grow our developer ecosystem."
    },
    {
      title: "Security Engineer",
      department: "Security",
      location: "Remote",
      icon: Shield,
      description: "Ensure our platform meets the highest security and privacy standards."
    }
  ];

  const benefits = [
    { title: "Competitive Salary", description: "Top-of-market compensation" },
    { title: "Equity", description: "Meaningful ownership stake" },
    { title: "Remote First", description: "Work from anywhere" },
    { title: "Health & Dental", description: "Comprehensive coverage" },
    { title: "Unlimited PTO", description: "Take time when you need it" },
    { title: "Learning Budget", description: "$2,000/year for courses & conferences" }
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
                Join the Team
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-black/70 mb-12">
              Help us build the future of bot protection
            </p>
          </div>
        </section>

        {/* Why Join Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-16 bg-black/5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">Why VoiceID?</h2>
            <Card className="p-8 border-2 border-neon-green/20">
              <div className="space-y-6">
                <div>
                  <Zap className="w-8 h-8 text-neon-green mb-2" />
                  <h3 className="text-xl font-bold mb-2">High Impact</h3>
                  <p className="text-black/70">
                    Your work directly prevents millions in fraud and improves user experiences 
                    for thousands of businesses.
                  </p>
                </div>
                <div>
                  <Rocket className="w-8 h-8 text-neon-green mb-2" />
                  <h3 className="text-xl font-bold mb-2">Cutting-Edge Tech</h3>
                  <p className="text-black/70">
                    Work with the latest AI models, voice biometrics, and real-time processing systems.
                  </p>
                </div>
                <div>
                  <Heart className="w-8 h-8 text-neon-green mb-2" />
                  <h3 className="text-xl font-bold mb-2">Great Culture</h3>
                  <p className="text-black/70">
                    Collaborative, supportive team that values work-life balance and personal growth.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Open Roles */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Open Roles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {openRoles.map((role) => {
                const Icon = role.icon;
                return (
                  <Card key={role.title} className="p-6 border-2 border-neon-green/20 hover-elevate">
                    <Icon className="w-8 h-8 text-neon-green mb-4" />
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold mb-2">{role.title}</h3>
                        <div className="flex gap-3 text-sm text-black/60">
                          <span>{role.department}</span>
                          <span>•</span>
                          <span>{role.location}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-black/70 mb-4">{role.description}</p>
                    <Button 
                      variant="outline" 
                      className="w-full border-neon-green text-neon-green hover:bg-neon-green hover:text-black"
                    >
                      Apply Now
                    </Button>
                  </Card>
                );
              })}
            </div>
            
            <div className="mt-12 text-center">
              <Card className="p-8 border-2 border-neon-green/20 inline-block">
                <h3 className="text-2xl font-bold mb-4">Don't See a Fit?</h3>
                <p className="text-black/70 mb-6">
                  We're always interested in hearing from exceptional people.
                </p>
                <Button 
                  variant="outline" 
                  className="border-neon-green text-neon-green hover:bg-neon-green hover:text-black"
                >
                  Send Us Your Resume
                </Button>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-black/5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Benefits & Perks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benefits.map((benefit) => (
                <Card key={benefit.title} className="p-6 border-2 border-neon-green/20">
                  <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                  <p className="text-black/70">{benefit.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

