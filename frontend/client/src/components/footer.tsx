import { Link } from "wouter";
import { Twitter, Github, Linkedin, Mail, Book, HelpCircle, FileText, Shield } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: "Features", href: "/#how", isAnchor: true },
      { label: "API Documentation", href: "/docs", isAnchor: false },
      { label: "Pricing", href: "/pricing", isAnchor: false },
      { label: "Use Cases", href: "/use-cases", isAnchor: false },
      { label: "Integrations", href: "/integrations", isAnchor: false },
      { label: "Changelog", href: "https://github.com/voiceid-tech/voiceid/releases", isAnchor: false },
    ],
    resources: [
      { label: "Documentation", href: "/docs", isAnchor: false, icon: Book },
      { label: "API Reference", href: "/api-reference", isAnchor: false },
      { label: "SDK & Libraries", href: "/sdk", isAnchor: false },
      { label: "Support", href: "mailto:support@voiceid.tech", isAnchor: false, icon: HelpCircle },
      { label: "Status Page", href: "https://status.voiceid.tech", isAnchor: false },
      { label: "Blog", href: "https://blog.voiceid.tech", isAnchor: false },
      { label: "Community", href: "https://github.com/voiceid-tech", isAnchor: false },
    ],
    company: [
      { label: "About Us", href: "/about", isAnchor: false },
      { label: "Contact", href: "mailto:hello@voiceid.tech", isAnchor: false },
      { label: "Careers", href: "/careers", isAnchor: false },
      { label: "Press Kit", href: "/press", isAnchor: false },
      { label: "Partners", href: "/partners", isAnchor: false },
    ],
    legal: [
      { label: "Terms of Service", href: "/terms", isAnchor: false, icon: FileText },
      { label: "Privacy Policy", href: "/privacy", isAnchor: false },
      { label: "Cookie Policy", href: "/cookies", isAnchor: false },
      { label: "GDPR Compliance", href: "/gdpr", isAnchor: false },
      { label: "Security", href: "/security", isAnchor: false, icon: Shield },
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

  const scrollToSection = (hash: string) => {
    // Wait for navigation to complete if needed
    setTimeout(() => {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleAnchorClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    if (href.startsWith("/#")) {
      // Anchor link to home page
      const hash = href.substring(1); // Get "#how" from "/#how"
      if (window.location.pathname !== "/") {
        // Navigate to home first, then scroll
        window.location.href = href;
      } else {
        // Already on home, just scroll
        scrollToSection(hash);
      }
    } else if (href.startsWith("#")) {
      // Same page anchor
      scrollToSection(href);
    }
  };

  const renderLink = (link: typeof footerLinks.product[0]) => {
    const isExternal = link.href.startsWith("http") || link.href.startsWith("mailto:");
    const isInternal = !isExternal && link.href.startsWith("/");
    const isAnchor = link.href.startsWith("#") || link.href.includes("#");
    
    // For anchor links or internal page links, use wouter Link
    if (!isExternal) {
      if (isAnchor && link.href.startsWith("/#")) {
        // Anchor link to home page
        return (
          <li key={link.label}>
            <a
              href={link.href}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className="text-sm text-black/70 hover:text-neon-green transition-colors flex items-center gap-1.5 group"
              data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {link.label}
            </a>
          </li>
        );
      } else if (isInternal) {
        // Regular internal link - use wouter Link for SPA navigation
        return (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-black/70 hover:text-neon-green transition-colors flex items-center gap-1.5 group"
              data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {link.label}
            </Link>
          </li>
        );
      }
    }
    
    // External links
    return (
      <li key={link.label}>
        <a
          href={link.href}
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
              <Link
                href="/terms"
                className="text-xs text-black/60 hover:text-neon-green transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy"
                className="text-xs text-black/60 hover:text-neon-green transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/cookies"
                className="text-xs text-black/60 hover:text-neon-green transition-colors"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

