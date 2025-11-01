# VoiceID.ai - Voice-Based Bot Protection Landing Page

## Overview

VoiceID.ai is a voice-based bot protection platform that provides 99.8% accurate human verification in under 10 seconds. This is a marketing landing page built with React, TypeScript, and shadcn/ui components, showcasing the product's key features, benefits, and technical capabilities. The page follows modern minimalist design principles with neon green (#00FF88) and emerald (#10B981) accent colors against a clean white background.

The landing page emphasizes the product's value proposition: eliminating 98% of bots through voice verification at $0.01 per pass, with 1000 free verifications to start. It targets developers and technical decision-makers with a YC S25-inspired aesthetic.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server, configured for:
  - Client-side rendering from the `client/` directory
  - Hot module replacement (HMR) for rapid development
  - Build output to `dist/public/`
  - Integration with Replit-specific plugins (cartographer, dev banner, runtime error overlay)

**Component Library & Styling**
- **shadcn/ui** (New York style variant) - A comprehensive set of accessible, customizable React components built on Radix UI primitives
- **Tailwind CSS** for utility-first styling with custom configuration:
  - Custom color system with neon green (#00FF88) and emerald (#10B981) accents
  - Extended spacing, border-radius, and shadow utilities
  - CSS variables for theme customization
  - Configured paths: `client/src/index.css` with base, components, and utilities layers
- **Component organization**: All UI components located in `client/src/components/ui/` with consistent patterns

**State Management & Data Fetching**
- **TanStack Query (React Query)** v5 for server state management
- Custom query client configuration with:
  - Infinite stale time (data doesn't auto-refetch)
  - Window focus refetch disabled
  - Custom fetch wrapper with credential handling
  - Centralized error handling for non-OK responses

**Routing**
- **Wouter** - Lightweight client-side routing library
- Simple route structure with home page and 404 not-found page
- Hash-based navigation for smooth scrolling to sections

**Design System**
- Based on `design_guidelines.md` specifications:
  - Modern minimalist aesthetic inspired by Linear, Vercel, and YC S25 startups
  - Pure white background with high-contrast black text
  - Neon green and emerald gradient accents for CTAs and highlights
  - Inter font family across all weights
  - Responsive typography scaling (9xl hero headlines on desktop, 6xl on mobile)
  - Glow effects using neon green with 20-40% opacity

### Backend Architecture

**Server Framework**
- **Express.js** with TypeScript running in ESM mode
- Development server: `tsx` for TypeScript execution
- Production build: `esbuild` bundling to `dist/index.js`

**API Structure**
- Routes registered through `server/routes.ts`
- All API endpoints prefixed with `/api`
- Request/response logging middleware with JSON body capture
- Body parsing for JSON and URL-encoded data with raw body preservation

**Development Setup**
- **Vite middleware mode** for development:
  - Express serves as the base server
  - Vite middleware handles HMR and client assets
  - Server-side rendering template from `client/index.html`
  - Shared HTTP server between Express and Vite for WebSocket support

**Static File Serving**
- Production: Static files served from `dist/public/`
- Development: Vite middleware handles all client requests

### Data Storage Solutions

**Database**
- **PostgreSQL** via Neon serverless driver (`@neondatabase/serverless`)
- **Drizzle ORM** for type-safe database operations:
  - Schema defined in `shared/schema.ts`
  - Migrations output to `./migrations/`
  - PostgreSQL dialect configuration

**Current Schema**
- `users` table with:
  - `id`: UUID primary key (auto-generated via `gen_random_uuid()`)
  - `username`: Unique text field
  - `password`: Text field for authentication
- Zod schema validation via `drizzle-zod` for insert operations

**In-Memory Storage**
- `MemStorage` class implementing `IStorage` interface for development/testing
- CRUD operations for users (get by ID, get by username, create)
- Map-based storage with UUID generation via Node.js crypto module

**Session Management**
- **connect-pg-simple** for PostgreSQL-backed session storage (dependency present)
- Session configuration not yet implemented but infrastructure ready

### External Dependencies

**UI Component Libraries**
- **Radix UI** - Unstyled, accessible component primitives:
  - Accordion, AlertDialog, Avatar, Checkbox, Dialog, DropdownMenu
  - HoverCard, Label, Menubar, NavigationMenu, Popover, Progress
  - RadioGroup, ScrollArea, Select, Separator, Slider, Switch
  - Tabs, Toast, Toggle, Tooltip, and more
- **Embla Carousel** - Carousel/slider functionality
- **cmdk** - Command menu component
- **Lucide React** - Icon library (implied by component usage)

**Form Handling**
- **React Hook Form** - Form state management
- **@hookform/resolvers** - Validation resolver integration
- **Zod** - Schema validation (via drizzle-zod)

**Utility Libraries**
- **clsx** & **tailwind-merge** - Conditional CSS class merging (via cn() utility)
- **class-variance-authority** - Component variant management
- **date-fns** - Date manipulation and formatting
- **vaul** - Drawer component library

**Development Tools**
- **Replit Plugins**:
  - `@replit/vite-plugin-runtime-error-modal` - Error overlay in development
  - `@replit/vite-plugin-cartographer` - Code navigation (dev only)
  - `@replit/vite-plugin-dev-banner` - Development environment indicator (dev only)

**Build Tools**
- **PostCSS** with Tailwind CSS and Autoprefixer plugins
- **esbuild** - Fast JavaScript bundler for server code
- **tsx** - TypeScript execution for development

**Type Safety**
- Full TypeScript configuration with strict mode enabled
- Path aliases for clean imports (`@/*`, `@shared/*`, `@assets/*`)
- ESNext module resolution with bundler mode
- Type definitions for Node.js and Vite client

**Environment Requirements**
- `DATABASE_URL` environment variable required for Drizzle configuration
- Node.js with ESM support
- Development mode detection via `NODE_ENV` and `REPL_ID` variables