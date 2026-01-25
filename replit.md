# Claude SEO Article Generator

## Overview

A full-stack web application that generates SEO-optimized Japanese articles using Claude AI (Sonnet 4.5). Users input a topic or rough draft, and the AI produces natural, human-like Japanese content. The app saves generated articles to a database and provides article history management with copy, download, and delete functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme supporting light/dark modes
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints under `/api/` prefix
- **Development**: Vite middleware serves frontend in development
- **Production**: Static file serving from built assets

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all database models
- **Validation**: Zod schemas derived from Drizzle schemas using drizzle-zod
- **Storage Abstraction**: In-memory storage class in `server/storage.ts` (can be swapped for database)

### AI Integration
- **Provider**: Anthropic Claude API (claude-sonnet-4-5 model)
- **Configuration**: Environment variables for API key and base URL
- **Batch Processing**: Utility module for concurrent API calls with rate limiting and retries

### Key Design Decisions

1. **Shared Schema Pattern**: Database schemas and TypeScript types are defined once in `shared/schema.ts` and imported by both frontend and backend, ensuring type safety across the stack.

2. **Component-Based UI**: Uses shadcn/ui which provides unstyled, accessible components that can be customized. Components are copied into the project rather than installed as dependencies.

3. **API Request Wrapper**: Centralized `apiRequest` function in `client/src/lib/queryClient.ts` handles all HTTP requests with consistent error handling and abort signal support.

4. **Theme System**: CSS custom properties define colors in HSL format, enabling smooth dark/light mode transitions without JavaScript color calculations.

## External Dependencies

### AI Services
- **Anthropic Claude API**: Article generation using claude-sonnet-4-5 model
  - Requires `AI_INTEGRATIONS_ANTHROPIC_API_KEY` environment variable
  - Requires `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` environment variable

### Database
- **PostgreSQL**: Primary data store
  - Requires `DATABASE_URL` environment variable
  - Migrations stored in `/migrations` directory
  - Push schema changes with `npm run db:push`

### Key NPM Packages
- `@anthropic-ai/sdk`: Official Anthropic API client
- `drizzle-orm` / `drizzle-kit`: Database ORM and migration tooling
- `@tanstack/react-query`: Async state management
- `express`: HTTP server framework
- `zod`: Runtime type validation
- `connect-pg-simple`: PostgreSQL session storage