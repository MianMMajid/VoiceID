import { useState, useEffect } from "react";

/**
 * Hook to detect scroll position and whether page is scrolled
 * Used for navbar translucent effect
 */
export function useScrollPosition() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          setScrollY(currentScrollY);
          setIsScrolled(currentScrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };

    // Check initial scroll position
    setScrollY(window.scrollY);
    setIsScrolled(window.scrollY > 50);

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return { isScrolled, scrollY };
}

