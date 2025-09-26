# EchoDeck Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from productivity platforms like Notion and presentation tools like Canva, with clean, professional aesthetics that prioritize content creation workflows.

## Core Design Elements

### Color Palette
**Light Mode:**
- Primary: 239 84% 67% (vibrant blue)
- Secondary: 217 91% 60% (deeper blue)
- Background: 0 0% 98% (off-white)
- Surface: 0 0% 100% (pure white)

**Dark Mode:**
- Primary: 239 84% 67% (same vibrant blue)
- Secondary: 217 91% 70% (lighter for contrast)
- Background: 222 84% 5% (deep dark blue)
- Surface: 215 28% 17% (elevated dark surface)

**Accent Colors:**
- Success: 142 76% 36% (green)
- Warning: 38 92% 50% (orange)
- Error: 0 84% 60% (red)

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Code Font**: JetBrains Mono (for API responses)
- **Hierarchy**: text-xs to text-4xl
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### Layout System
**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, and 12
- Tight spacing: p-2, m-2
- Standard spacing: p-4, m-4, gap-4
- Section spacing: p-6, m-6
- Large spacing: p-8, m-8
- Extra large: p-12, m-12

### Component Library

**Navigation:**
- Clean sidebar with collapsible sections
- Breadcrumb navigation for multi-step processes
- Tab navigation for presentation editing modes

**Forms:**
- Rounded input fields (rounded-lg)
- Floating labels for text inputs
- Multi-step form progress indicators
- File upload with drag-and-drop zones

**Data Display:**
- Card-based presentation previews
- Timeline view for generation progress
- Modal overlays for detailed editing
- Toast notifications for status updates

**Buttons:**
- Primary: Filled with primary color
- Secondary: Outline style
- Ghost: Text-only for subtle actions
- When used over images: Blurred background with backdrop-blur-sm

## Visual Hierarchy
1. **Hero Section**: Prominent heading, subtext, and primary CTA
2. **Feature Cards**: Grid layout showcasing AI capabilities
3. **Demo Section**: Interactive preview of presentation generation
4. **Process Flow**: Step-by-step visualization of the AI workflow

## Images
**Hero Image**: Large, professional image showing AI-generated presentations or modern workspace (positioned as background with overlay)
**Feature Icons**: Simple, minimalist icons representing each AI capability
**Demo Screenshots**: Clean mockups of the interface in action
**Process Illustrations**: Subtle graphics showing data flow and AI processing

## Interaction Patterns
- Smooth transitions between steps (duration-200)
- Loading states with skeleton screens
- Progressive disclosure for advanced features
- Contextual help tooltips
- Real-time preview updates during editing

## Responsive Design
- Mobile-first approach
- Collapsible sidebar on mobile
- Stacked card layouts on smaller screens
- Touch-friendly button sizing (min-h-12)

This design system creates a professional, trustworthy interface that emphasizes the AI-powered capabilities while maintaining usability for content creators and presenters.