# VoiceID.ai Landing Page Design Guidelines

## Design Approach
**Modern Minimalist with High-Impact Accents** - Inspired by Linear, Vercel, and contemporary YC S25 startup aesthetics. Clean white canvas with strategic neon green highlights creating a cutting-edge, technical feel that emphasizes speed and precision.

## Color System
- **Primary Background**: Pure white (#FFFFFF)
- **Text**: High-contrast black (#000000) for maximum readability
- **Accent Primary**: Neon Green (#00FF88) - used for CTAs, highlights, and glow effects
- **Accent Secondary**: Emerald (#10B981) - used in gradients and secondary accents
- **Gradients**: Combine neon green to emerald for dynamic visual interest
- **Glow Effects**: Neon green with 20-40% opacity for subtle halos around key elements

## Typography
- **Font Family**: Inter (all weights)
- **Hero Headline**: 
  - Desktop: 9xl (extremely large, ~8rem+), font-black weight
  - Mobile: 6xl, scaling down appropriately
  - Treatment: Gradient text using black-to-neon-green or neon-green-to-emerald
  - Line breaks: Strategic breaks for emphasis ("VoiceID" / "Kills 98%" / "Bots in 10s")
- **Section Headers**: 4xl-5xl, font-bold, black text
- **Body Copy**: lg-xl sizing, regular weight, black text with generous line-height
- **Metrics/Numbers**: 6xl-7xl, font-black, neon green color
- **Code Snippets**: Monospace font, smaller sizing with syntax highlighting

## Layout System
- **Spacing Primitives**: Tailwind units of 4, 6, 8, 12, 16, 20, 24, 32 (p-4, p-8, py-20, etc.)
- **Container**: Full-width sections with inner max-w-7xl containers, centered
- **Section Padding**: py-20 to py-32 on desktop, py-12 to py-16 on mobile
- **Grid Systems**: 3-column grids for metrics/features, 2-column for code examples, single column for narrative content

## Component Library

### Hero Section (Full Viewport)
- **Badge**: Pulsing animation, neon-green/20 border, "🎤 Live API" text
- **Headline**: Massive gradient text with strategic line breaks
- **Subheadline**: Large supporting text, black color
- **Dual CTAs**: 
  - Primary: Neon green background, white text, large padding, "🚀 Start Free - 1k Free Verifications"
  - Secondary: Neon green outline/border, black text, "Watch Demo"
- **Metrics Grid**: 3 cards with glow effects displaying "99.8%", "-98% Bots", "<10s"
- **Video Placeholder**: Large box with neon green glow border, text "🎥 Voice Demo: Speak → ✅ Human"

### Metric Cards
- White background with subtle neon green glow shadow
- Hover effect: scale-105 transform with increased glow
- Large numbers in neon green, 6xl-7xl sizing
- Descriptive text below in black, smaller sizing
- Rounded corners (rounded-2xl)

### Problem Section
- **Header**: "Bot Apocalypse" in large bold text
- **Stats Layout**: 3 columns showing statistics with icons
  - 🤖 60% Bots online
  - 💸 $200B fraud annually
  - 😩 CAPTCHA frustration
- **Visual Element**: Large green glowing skull/death icon as centerpiece

### How It Works Section
- **Title**: "3 Lines of Code" in large text
- **3 Cards**: Hover-glow effect cards with:
  - Icon at top (🎤 Speak | ✅ Cert | 💀 Dead)
  - Title and description
  - Glow intensifies on hover
- **Code Snippets**: Dark background boxes with syntax-highlighted code showing `vlo.verify()` implementation

### Technology Proof Section
- Gray muted text displaying partner logos/names
- Single row layout: "Powered by: ElevenLabs • SpeechBrain • Whisper • Vercel • Replit"
- Subtle, non-distracting presentation

### Final CTA Section
- **Header**: "Ready to Kill Bots?" in large bold text
- **Subtext**: "1k Free. No CC Required" 
- **Button**: Massive neon green button with white text, "Get API Key →"
- **Social**: "DM @voiceid_ai" in smaller text below

## Images
No traditional hero background image needed. The design relies on:
- **Video Demo Placeholder**: Large rectangular box with neon green glow border serving as the primary visual anchor in hero
- **Icon System**: Emoji-based or simple vector icons throughout (🎤, ✅, 💀, 🤖, 💸, 😩)
- **Glow Effects**: Visual interest through CSS glow/shadow effects rather than imagery

## Interaction Design
- **Smooth Scroll**: Navigation links scroll smoothly to section IDs (#problem, #how, #api-key)
- **Hover States**: 
  - Cards: scale-105 transform with enhanced glow
  - Buttons: subtle brightness increase
- **Transitions**: All interactions use smooth 200-300ms transitions
- **Pulse Animation**: Subtle pulse on the API status badge
- **Mobile Navigation**: Hamburger menu if needed, otherwise simple anchor links

## Accessibility
- High contrast ratio (black on white, white on neon green)
- Large touch targets for all CTAs (minimum 44x44px)
- Clear focus states on interactive elements
- Semantic HTML structure for screen readers
- Alt text for all visual elements

## Mobile Responsiveness
- Hero headline scales from 9xl → 6xl
- 3-column grids collapse to single column
- Dual CTAs stack vertically
- Padding reduces from py-32 → py-12
- Video placeholder maintains aspect ratio
- Code snippets become horizontally scrollable if needed

## Visual Hierarchy
1. **Primary**: Hero headline with gradient, massive CTA buttons
2. **Secondary**: Metric cards with glowing numbers, section headers
3. **Tertiary**: Body copy, code snippets, proof section
4. **Accent**: Neon green used sparingly for maximum impact on key conversion points