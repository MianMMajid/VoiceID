import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { FileText } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      
      <div className="pt-32 md:pt-36 pb-20">
        <section className="px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <FileText className="w-16 h-16 text-neon-green mx-auto mb-4" />
              <h1 className="text-5xl sm:text-6xl font-bold mb-4">
                Terms of Service
              </h1>
              <p className="text-black/60">Last updated: {new Date().toLocaleDateString()}</p>
            </div>

            <Card className="p-8 border-2 border-neon-green/20">
              <div className="prose prose-lg max-w-none text-black/80 space-y-6">
                <section>
                  <h2 className="text-2xl font-bold mb-4">1. Agreement to Terms</h2>
                  <p>
                    By accessing or using VoiceID's services, you agree to be bound by these Terms of Service. 
                    If you disagree with any part of these terms, you may not access the service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
                  <p>
                    VoiceID provides voice-based bot verification services through an API. We offer a free tier 
                    of 1,000 verifications and paid plans starting at $0.01 per verification.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
                  <p>
                    You are responsible for maintaining the security of your API key and account. You agree to 
                    notify us immediately of any unauthorized use of your account.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">4. Acceptable Use</h2>
                  <p>You agree not to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Use the service for any illegal purpose</li>
                    <li>Attempt to circumvent or interfere with our security measures</li>
                    <li>Use the service to verify non-human voices fraudulently</li>
                    <li>Resell the service without written permission</li>
                    <li>Reverse engineer or attempt to extract our proprietary algorithms</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">5. Payment Terms</h2>
                  <p>
                    Paid plans are billed based on usage. You are responsible for all charges incurred under your 
                    account. Unused verifications do not roll over to the next billing period.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">6. Data and Privacy</h2>
                  <p>
                    Voice data submitted through our API is processed in real-time and may be stored temporarily 
                    for quality improvement. See our <Link href="/privacy" className="text-neon-green hover:underline">Privacy Policy</Link> for details.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">7. Service Availability</h2>
                  <p>
                    We strive for 99.9% uptime but do not guarantee uninterrupted service. We are not liable for 
                    service interruptions or failures.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">8. Limitation of Liability</h2>
                  <p>
                    VoiceID is provided "as is" without warranties of any kind. We are not liable for any 
                    indirect, incidental, or consequential damages arising from use of the service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">9. Termination</h2>
                  <p>
                    We reserve the right to suspend or terminate your account if you violate these terms. 
                    You may terminate your account at any time.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">10. Changes to Terms</h2>
                  <p>
                    We may modify these terms at any time. Continued use of the service after changes 
                    constitutes acceptance of the new terms.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">11. Contact</h2>
                  <p>
                    For questions about these terms, contact us at{" "}
                    <a href="mailto:legal@voiceid.tech" className="text-neon-green hover:underline">
                      legal@voiceid.tech
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

