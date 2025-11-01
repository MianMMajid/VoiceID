import { Twitter, Github, Linkedin, Mail, Book, HelpCircle, FileText, Shield } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: "Features", href: "#how", isAnchor: true },
      { label: "API Documentation", href: "#api-key", isAnchor: true },
      { label: "Pricing", href: "#api-key", isAnchor: true },
      { label: "Use Cases", href: "#how", isAnchor: true },
      { label: "Integrations", href: "#how", isAnchor: true },
      { label: "Changelog", href: "https://github.com/voiceid-tech/voiceid/releases", isAnchor: false },
    ],
    resources: [
      { label: "Documentation", href: "#api-key", isAnchor: true, icon: Book },
      { label: "API Reference", href: "#api-key", isAnchor: true },
      { label: "SDK & Libraries", href: "#api-key", isAnchor: true },
      { label: "Support", href: "mailto:support@voiceid.tech", isAnchor: false, icon: HelpCircle },
      { label: "Status Page", href: "https://status.voiceid.tech", isAnchor: false },
      { label: "Blog", href: "https://blog.voiceid.tech", isAnchor: false },
      { label: "Community", href: "https://github.com/voiceid-tech", isAnchor: false },
    ],
    company: [
      { label: "About Us", href: "https://voiceid.tech/about", isAnchor: false },
      { label: "Contact", href: "mailto:hello@voiceid.tech", isAnchor: false },
      { label: "Careers", href: "https://voiceid.tech/careers", isAnchor: false },
      { label: "Press Kit", href: "https://voiceid.tech/press", isAnchor: false },
      { label: "Partners", href: "https://voiceid.tech/partners", isAnchor: false },
    ],
    legal: [
      { label: "Terms of Service", href: "https://voiceid.tech/terms", isAnchor: false, icon: FileText },
      { label: "Privacy Policy", href: "https://voiceid.tech/privacy", isAnchor: false },
      { label: "Cookie Policy", href: "https://voiceid.tech/cookies", isAnchor: false },
      { label: "GDPR Compliance", href: "https://voiceid.tech/gdpr", isAnchor: false },
      { label: "Security", href: "https://voiceid.tech/security", isAnchor: false, icon: Shield },
    ],
  };

  const socialLinks = [
    {
      label: "Twitter",
      href: "https://twitter.com/voiceid_tech",
      icon: Twitter,
    },
    {
      label: "GitHub",
      href: "https://github.com/voiceid-tech",
      icon: Github,
    },
    {
      label: "LinkedIn",
      href: "https://linkedin.com/company/voiceid-tech",
      icon: Linkedin,
    },
    {
      label: "Email",
      href: "mailto:hello@voiceid.tech",
      icon: Mail,
    },
  ];

  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, link: typeof footerLinks.product[0]) => {
    if (link.isAnchor) {
      e.preventDefault();
      scrollToSection(link.href);
    }
    // For external links, let the browser handle navigation naturally
  };

  const renderLink = (link: typeof footerLinks.product[0]) => {
    const isExternal = link.href.startsWith("http") || link.href.startsWith("mailto:");
    
    return (
      <li key={link.label}>
        <a
          href={link.href}
          onClick={(e) => handleLinkClick(e, link)}
          className="text-sm text-black/70 hover:text-neon-green transition-colors flex items-center gap-1.5 group"
          target={isExternal && !link.href.startsWith("mailto:") ? "_blank" : undefined}
          rel={isExternal && !link.href.startsWith("mailto:") ? "noopener noreferrer" : undefined}
          data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {link.label}
          {isExternal && link.href.startsWith("http") && (
            <span className="text-xs opacity-0 group-hover:opacity-50 transition-opacity">↗</span>
          )}
        </a>
      </li>
    );
  };

  return (
    <footer className="bg-white border-t border-black/10" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-black mb-4 uppercase tracking-wide">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map(renderLink)}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-black mb-4 uppercase tracking-wide">
              Resources
            </h3>
            <ul className="space-y-3">
              {footerLinks.resources.map(renderLink)}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-black mb-4 uppercase tracking-wide">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map(renderLink)}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-black mb-4 uppercase tracking-wide">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map(renderLink)}
            </ul>
          </div>
        </div>

        {/* Social Links & Contact */}
        <div className="border-t border-black/10 pt-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0">
            {/* Brand Info */}
            <div className="flex flex-col items-center md:items-start space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold bg-gradient-to-r from-black to-neon-green/80 bg-clip-text text-transparent">
                  VoiceID.tech
                </span>
              </div>
              <p className="text-xs text-black/50 text-center md:text-left max-w-xs">
                Voice-based bot protection powered by AI
              </p>
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target={social.href.startsWith("http") || social.href.startsWith("mailto:") ? "_blank" : undefined}
                    rel={
                      social.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="text-black/60 hover:text-neon-green transition-colors p-2 hover:bg-black/5 rounded-md"
                    aria-label={social.label}
                    title={social.label}
                    data-testid={`social-link-${social.label.toLowerCase()}`}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-black/10 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <p className="text-sm text-black/60 text-center md:text-left">
              © {currentYear} VoiceID.tech. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 flex-wrap justify-center md:justify-end">
              <a
                href="https://voiceid.tech/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-black/60 hover:text-neon-green transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="https://voiceid.tech/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-black/60 hover:text-neon-green transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="https://voiceid.tech/cookies"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-black/60 hover:text-neon-green transition-colors"
              >
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

