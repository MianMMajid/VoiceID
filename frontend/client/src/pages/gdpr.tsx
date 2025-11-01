import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Shield, CheckCircle } from "lucide-react";

export default function GDPR() {
  const rights = [
    {
      title: "Right to Access",
      description: "You can request a copy of all personal data we hold about you."
    },
    {
      title: "Right to Rectification",
      description: "You can request correction of inaccurate or incomplete data."
    },
    {
      title: "Right to Erasure",
      description: "You can request deletion of your personal data under certain conditions."
    },
    {
      title: "Right to Restrict Processing",
      description: "You can request that we limit how we process your data."
    },
    {
      title: "Right to Data Portability",
      description: "You can request your data in a structured, machine-readable format."
    },
    {
      title: "Right to Object",
      description: "You can object to processing of your data for legitimate interests."
    }
  ];

  const measures = [
    "Data encryption in transit and at rest",
    "Regular security audits and assessments",
    "Access controls and authentication",
    "Data minimization principles",
    "Privacy by design architecture",
    "Regular staff training on data protection"
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      
      <div className="pt-32 md:pt-36 pb-20">
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Shield className="w-16 h-16 text-neon-green mx-auto mb-4" />
              <h1 className="text-5xl sm:text-6xl font-bold mb-4">
                GDPR Compliance
              </h1>
              <p className="text-black/60">
                VoiceID is committed to full compliance with the General Data Protection Regulation
              </p>
            </div>

            <Card className="p-8 border-2 border-neon-green/20 mb-8">
              <h2 className="text-2xl font-bold mb-4">What is GDPR?</h2>
              <p className="text-black/80 mb-4">
                The General Data Protection Regulation (GDPR) is a European Union regulation that governs 
                data protection and privacy for individuals within the EU. It applies to all organizations 
                that process personal data of EU residents, regardless of where the organization is located.
              </p>
              <p className="text-black/80">
                VoiceID is fully compliant with GDPR requirements and treats all user data with the highest 
                standards of protection, regardless of user location.
              </p>
            </Card>

            <Card className="p-8 border-2 border-neon-green/20 mb-8">
              <h2 className="text-2xl font-bold mb-6">Your GDPR Rights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rights.map((right) => (
                  <div key={right.title} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-neon-green flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">{right.title}</h3>
                      <p className="text-sm text-black/70">{right.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-neon-green/10 rounded-lg">
                <p className="text-black/80">
                  To exercise any of these rights, please contact us at{" "}
                  <a href="mailto:privacy@voiceid.tech" className="text-neon-green font-semibold hover:underline">
                    privacy@voiceid.tech
                  </a>
                  . We will respond within 30 days.
                </p>
              </div>
            </Card>

            <Card className="p-8 border-2 border-neon-green/20 mb-8">
              <h2 className="text-2xl font-bold mb-4">Our GDPR Measures</h2>
              <div className="space-y-3">
                {measures.map((measure) => (
                  <div key={measure} className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-neon-green flex-shrink-0" />
                    <span className="text-black/80">{measure}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-8 border-2 border-neon-green/20 mb-8">
              <h2 className="text-2xl font-bold mb-4">Data Processing Legal Basis</h2>
              <div className="space-y-4 text-black/80">
                <div>
                  <h3 className="font-semibold mb-2">Contract Performance</h3>
                  <p className="text-sm">
                    We process your data to provide the services you've requested (e.g., voice verification).
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Legitimate Interests</h3>
                  <p className="text-sm">
                    We process data to improve our services, prevent fraud, and ensure security.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Consent</h3>
                  <p className="text-sm">
                    We process data with your explicit consent when required (e.g., marketing communications).
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Legal Obligation</h3>
                  <p className="text-sm">
                    We process data to comply with legal requirements (e.g., tax reporting, fraud prevention).
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-2 border-neon-green/20">
              <h2 className="text-2xl font-bold mb-4">Data Protection Officer</h2>
              <p className="text-black/80 mb-4">
                VoiceID has appointed a Data Protection Officer (DPO) to oversee our GDPR compliance.
              </p>
              <p className="text-black/80">
                Contact our DPO at{" "}
                <a href="mailto:dpo@voiceid.tech" className="text-neon-green font-semibold hover:underline">
                  dpo@voiceid.tech
                </a>
              </p>
            </Card>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

