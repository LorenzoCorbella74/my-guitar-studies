# My Guitar Studies

A modern web application for organizing and visualizing guitar study sessions with interactive fretboard diagrams, music theory tools, and rich note-taking capabilities.

## Overview

**My Guitar Studies** is an Angular-based progressive web app designed to help guitarists document and analyze their practice sessions. It combines interactive SVG fretboard visualizations with flexible note-taking, enabling users to create comprehensive study materials that include scales, arpeggios, chord diagrams, comparison tables, and rich text annotations.

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Angular 21 (Standalone Components) |
| **Backend** | Firebase (Auth + Firestore) |
| **Music Theory** | Tonal.js v6 |
| **Audio** | smplr (soundfonts) |
| **Rich Text Editor** | ngx-editor |
| **Icons** | Lucide Angular |
| **Modals** | Angular CDK Overlay |
| **Styling** | Tailwind CSS v4 + DaisyUI |
| **State Management** | Angular Signals |

## Getting Started

### Prerequisites
- Node.js 18+ and npm 10+
- Firebase project with Firestore and Authentication enabled

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd my-guitar-studies

# Install dependencies
npm install

# Configure environment variables
# Copy .env.local file and add your Firebase credentials
cp .env.example .env.local
# Edit .env.local with your Firebase config values

# Start development server
npm start
```

The app will be available at `http://localhost:4200`

### Environment Variables

Create a `.env.local` file in the root directory with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

The `firebase.ts` configuration file is auto-generated from these variables.

### Available Scripts

- `npm start` - Start development server (auto-generates Firebase config)
- `npm run build` - Build for production (auto-generates Firebase config)
- `npm test` - Run unit tests

### Deployment

For deployment instructions to Netlify, see [NETLIFY.md](NETLIFY.md).

## Architecture

Built with Angular 21's latest features:
- **Standalone Components** (default, no `standalone: true` needed)
- **Signal-based State Management** using `signal()`, `computed()`, and `effect()`
- **`input()` / `output()` Functions** instead of decorators
- **`inject()` Function** for dependency injection
- **OnPush Change Detection** for optimal performance
- **Native Control Flow** (`@if`, `@for`, `@switch`)

## Resources

- [Lucide Icons](https://lucide.dev/icons/)
- [Lucide Angular Guide](https://lucide.dev/guide/angular/getting-started)
- [Firebase Console](https://console.firebase.google.com/u/0/project/my-guitar-studies/firestore/databases/-default-/data/)
- [Tonal.js Documentation](https://github.com/tonaljs/tonal)

## License

Private project for personal use.