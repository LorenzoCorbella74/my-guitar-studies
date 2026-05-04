# Netlify Deployment

## Environment Variables Setup

Add the following environment variables in your Netlify site settings:

**Site Settings → Environment Variables → Add a variable**

```
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Build Settings

- **Build command**: `npm run build`
- **Publish directory**: `dist/my-guitar-studies/browser`
- **Node version**: 18 or higher

## Deployment Process

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect repository to Netlify
3. Configure environment variables (see above)
4. Deploy!

The `prebuild` script will automatically generate the Firebase configuration from environment variables during deployment.
