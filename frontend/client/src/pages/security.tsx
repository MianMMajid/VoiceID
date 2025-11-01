import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Shield, Lock, Eye, Server, CheckCircle } from "lucide-react";

export default function Security() {
  const features = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description: "All voice data is encrypted in transit (TLS 1.3) and at rest (AES-256)"
    },
    {
      icon: Shield,
      title: "SOC 2 Compliance",
      description: "We're undergoing SOC 2 Type II certification to ensure enterprise-grade security"
    },
    {
      icon: Eye,
      title: "Access Controls",
      description: "Role-based access control (RBAC) and API key authentication for all operations"
    },
    {
      icon: Server,
      title: "Infrastructure Security",
      description: "Hosted on secure cloud infrastructure with regular security audits"
    },
    {
      icon: CheckCircle,
      title: "Regular Audits",
      description: "Third-party security audits and penetration testing conducted quarterly"
    },
    {
      icon: Lock,
      title: "Data Isolation",
      description: "Multi-tenant architecture with strict data isolation between customers"
    }
  ];

  const practices = [
    "Secure coding practices and code reviews",
    "Automated security scanning in CI/CD",
    "Dependency vulnerability monitoring",
    "Incident response plan and team",
    "Regular security training for all staff",
    "Bug bounty program coming soon"
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      
      <div className="pt-32 md:pt-36 pb-20">
        {/* Hero Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <Shield className="w-20 h-20 text-neon-green mx-auto mb-6" />
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-black to-neon-green/80 bg-clip-text text-transparent">
                Security
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-black/70 mb-12">
              Enterprise-grade security built into every layer of our platform
            </p>
          </div>
        </section>

        {/* Security Features */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Security Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="p-6 border-2 border-neon-green/20 hover-elevate">
                    <Icon className="w-8 h-8 text-neon-green mb-4" />
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-black/70">{feature.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Security Practices */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-black/5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">Security Practices</h2>
            <Card className="p-8 border-2 border-neon-green/20">
              <div className="space-y-3">
                {practices.map((practice) => (
                  <div key={practice} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-neon-green flex-shrink-0" />
                    <span className="text-black/80">{practice}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* Compliance */}
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center">Compliance & Certifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 border-2 border-neon-green/20">
                <h3 className="text-xl font-bold mb-3">GDPR</h3>
                <p className="text-black/70 mb-4">
                  Fully compliant with the General Data Protection Regulation. See our{" "}
                  <Link href="/gdpr" className="text-neon-green hover:underline">GDPR page</Link> for details.
                </p>
                <span className="inline-block px-3 py-1 bg-neon-green/10 text-neon-green rounded-full text-sm font-semibold">
                  Compliant
                </span>
              </Card>
              <Card className="p-6 border-2 border-neon-green/20">
                <h3 className="text-xl font-bold mb-3">SOC 2</h3>
                <p className="text-black/70 mb-4">
                  Undergoing SOC 2 Type II certification for enterprise security standards.
                </p>
                <span className="inline-block px-3 py-1 bg-neon-green/10 text-neon-green rounded-full text-sm font-semibold">
                  In Progress
                </span>
              </Card>
            </div>
          </div>
        </section>

        {/* Reporting */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-black/5">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-8">Report a Security Issue</h2>
            <Card className="p-8 border-2 border-neon-green/20 inline-block">
              <p className="text-lg text-black/70 mb-6">
                If you discover a security vulnerability, please report it to us responsibly.
              </p>
              <a 
                href="mailto:security@voiceid.tech"
                className="text-2xl font-bold text-neon-green hover:underline"
              >
                security@voiceid.tech
              </a>
              <p className="text-sm text-black/60 mt-4">
                We appreciate responsible disclosure and will acknowledge valid reports.
              </p>
            </Card>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

