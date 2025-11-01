import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      
      <div className="pt-32 md:pt-36 pb-20">
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Shield className="w-16 h-16 text-neon-green mx-auto mb-4" />
              <h1 className="text-5xl sm:text-6xl font-bold mb-4">
                Privacy Policy
              </h1>
              <p className="text-black/60">Last updated: {new Date().toLocaleDateString()}</p>
            </div>

            <Card className="p-8 border-2 border-neon-green/20">
              <div className="prose prose-lg max-w-none text-black/80 space-y-6">
                <section>
                  <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
                  <p>
                    VoiceID ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy 
                    explains how we collect, use, and protect your personal information when you use our service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
                  <h3 className="text-xl font-semibold mb-2">Account Information</h3>
                  <p>
                    When you create an account, we collect your email address and any information you provide 
                    during registration.
                  </p>
                  <h3 className="text-xl font-semibold mb-2 mt-4">Voice Data</h3>
                  <p>
                    When you use our API to verify voices, we receive audio recordings. These recordings are 
                    processed in real-time for verification purposes and may be stored temporarily for quality 
                    improvement and fraud prevention.
                  </p>
                  <h3 className="text-xl font-semibold mb-2 mt-4">Usage Data</h3>
                  <p>
                    We collect information about how you use our service, including API call logs, error rates, 
                    and performance metrics.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>To provide and improve our verification services</li>
                    <li>To process payments and manage your account</li>
                    <li>To detect and prevent fraud or abuse</li>
                    <li>To improve our AI models and accuracy</li>
                    <li>To communicate with you about your account or service updates</li>
                    <li>To comply with legal obligations</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">4. Data Storage and Retention</h2>
                  <p>
                    Voice recordings are typically processed in real-time and deleted within 30 days unless 
                    retained for quality improvement purposes (anonymized). Account information is retained 
                    while your account is active.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">5. Data Sharing</h2>
                  <p>We do not sell your personal information. We may share data with:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Service providers who help us operate our platform (e.g., cloud hosting, payment processing)</li>
                    <li>Law enforcement when required by law</li>
                    <li>Business partners with your explicit consent</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">6. Your Rights</h2>
                  <p>You have the right to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Access your personal data</li>
                    <li>Correct inaccurate data</li>
                    <li>Request deletion of your data</li>
                    <li>Object to processing of your data</li>
                    <li>Export your data</li>
                  </ul>
                  <p className="mt-4">
                    To exercise these rights, contact us at{" "}
                    <a href="mailto:privacy@voiceid.tech" className="text-neon-green hover:underline">
                      privacy@voiceid.tech
                    </a>
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">7. Security</h2>
                  <p>
                    We implement industry-standard security measures to protect your data, including encryption 
                    in transit and at rest, access controls, and regular security audits.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">8. GDPR Compliance</h2>
                  <p>
                    We comply with the General Data Protection Regulation (GDPR). For more details, see our{" "}
                    <Link href="/gdpr" className="text-neon-green hover:underline">GDPR Compliance page</Link>.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">9. Cookies</h2>
                  <p>
                    We use cookies to improve your experience. See our{" "}
                    <Link href="/cookies" className="text-neon-green hover:underline">Cookie Policy</Link> for details.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">10. Children's Privacy</h2>
                  <p>
                    Our service is not intended for users under 18. We do not knowingly collect data from children.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">11. Changes to This Policy</h2>
                  <p>
                    We may update this Privacy Policy from time to time. We will notify you of significant changes 
                    by email or through our service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">12. Contact Us</h2>
                  <p>
                    For privacy-related questions, contact us at{" "}
                    <a href="mailto:privacy@voiceid.tech" className="text-neon-green hover:underline">
                      privacy@voiceid.tech
                    </a>
                  </p>
                </section>
              </div>
            </Card>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

