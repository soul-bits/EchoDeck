# EchoDeck - AI-Powered Presentation Generator

## Overview

EchoDeck is an AI-powered system that transforms spoken audio input into polished, professional presentations. Users can record or upload audio files (3-5 minutes), and the system generates complete slide decks with titles, bullet points, speaker notes, AI-generated visuals, and multiple export formats (PDF, HTML, video). The application leverages OpenAI's suite of APIs including Whisper for transcription, GPT-4o for content generation, DALL-E 3 for image creation, and TTS for narration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom design system supporting light/dark themes
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Component Structure**: Modular components with clear separation of concerns including AudioRecorder, StyleSelector, ProcessingStatus, and PresentationOutput

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for presentation CRUD operations and file uploads
- **File Handling**: Multer middleware for audio file uploads with validation
- **Storage Layer**: Abstracted storage interface supporting both in-memory and database implementations
- **Error Handling**: Centralized error handling with proper HTTP status codes

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon serverless database for scalable cloud deployment
- **Schema Design**: Relational structure with presentations, slides, and exports tables
- **File Storage**: Local file system for audio uploads with configurable upload limits
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple

### Authentication and Authorization
- **Session-based Authentication**: Server-side sessions stored in PostgreSQL
- **User Management**: Username/password authentication with bcrypt hashing
- **Route Protection**: Middleware-based access control for authenticated endpoints
- **CORS Configuration**: Configured for cross-origin requests in development

### Design System
- **Color Palette**: Professional blue-based theme with vibrant primary colors
- **Typography**: Inter font family for modern, readable text
- **Layout System**: Consistent spacing using Tailwind's scale (2, 4, 6, 8, 12)
- **Component Variants**: Comprehensive button, badge, and card variants for different contexts
- **Responsive Design**: Mobile-first approach with breakpoint-specific styling

## External Dependencies

### AI Services
- **OpenAI API**: Primary integration for all AI capabilities
  - **Whisper API**: Speech-to-text transcription with timestamp support
  - **GPT-4o**: Content generation for slide outlines and speaker notes
  - **DALL-E 3**: AI image generation for slide visuals (16:9 aspect ratio)
  - **TTS (Text-to-Speech)**: Voice narration for video exports

### Database and Infrastructure
- **Neon Database**: Serverless PostgreSQL for production deployment
- **Drizzle Kit**: Database schema management and migrations
- **Connect-pg-Simple**: PostgreSQL session store for Express sessions

### Development and Deployment
- **Vite**: Fast development server and build tool with HMR support
- **ESBuild**: Production bundling for server-side code
- **Replit Integration**: Development environment with runtime error overlay and cartographer plugin

### UI and Styling
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Lucide React**: Icon library for consistent iconography
- **React Hook Form**: Form state management with validation
- **Date-fns**: Date manipulation and formatting utilities

### File Processing
- **Multer**: Multipart form data handling for audio file uploads
- **File Type Validation**: Support for MP3, WAV, MP4, and OGG audio formats
- **Size Limits**: 50MB maximum file size for audio uploads