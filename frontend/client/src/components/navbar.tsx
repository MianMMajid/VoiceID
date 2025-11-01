import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useScrollPosition } from "@/hooks/use-scroll-position";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, X, Mic } from "lucide-react";

interface NavbarProps {
  onGetApiKey?: () => void;
}

const navLinks = [
  { label: "Features", href: "#how" },
  { label: "Problem", href: "#problem" },
  { label: "API", href: "#api-key" },
];

export function Navbar({ onGetApiKey }: NavbarProps) {
  const { isScrolled } = useScrollPosition();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-md border-b border-black/10 shadow-sm"
          : "bg-transparent"
      }`}
      data-testid="navbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center space-x-2 group"
            >
              <Mic className="w-6 h-6 md:w-7 md:h-7 text-neon-green group-hover:text-emerald-500 transition-colors" />
              <span className="text-xl md:text-2xl font-black bg-gradient-to-r from-black to-neon-green/80 bg-clip-text text-transparent">
                VoiceID
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(link.href);
                  }}
                  className="text-sm font-medium text-black/70 hover:text-neon-green transition-colors"
                  data-testid={`nav-link-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </a>
              ))}
              <Button
                size="sm"
                className="bg-neon-green text-black border-neon-green font-semibold hover:bg-emerald-500"
                onClick={onGetApiKey}
                data-testid="nav-button-get-api-key"
              >
                Get API Key
              </Button>
            </div>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  data-testid="mobile-menu-trigger"
                >
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center space-x-2">
                    <Mic className="w-6 h-6 text-neon-green" />
                    <span className="text-xl font-black">VoiceID</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-8">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(link.href);
                      }}
                      className="text-base font-medium text-black hover:text-neon-green transition-colors py-2"
                      data-testid={`mobile-nav-link-${link.label.toLowerCase()}`}
                    >
                      {link.label}
                    </a>
                  ))}
                  <Button
                    className="mt-4 bg-neon-green text-black border-neon-green font-semibold w-full"
                    onClick={() => {
                      if (onGetApiKey) {
                        onGetApiKey();
                        setMobileMenuOpen(false);
                      }
                    }}
                    data-testid="mobile-nav-button-get-api-key"
                  >
                    Get API Key
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </nav>
  );
}

