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

### Prerequisites
- Node.js 18+ and npm 10+
- Firebase project with Firestore and Authentication enabled

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