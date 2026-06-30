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

## SPA Routing (Refresh su URL profonde)

Per evitare errore 404 quando l'utente ricarica una route client-side (ad esempio `/sessions/:id`), serve un fallback verso `index.html`.

Il progetto include `netlify.toml` con:

```toml
[[redirects]]
	from = "/*"
	to = "/index.html"
	status = 200
```

In questo modo Netlify serve l'app Angular anche su URL non fisicamente presenti su disco e il router gestisce la navigazione lato client.

## Deployment Process

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect repository to Netlify
3. Configure environment variables (see above)
4. Deploy!

The `prebuild` script will automatically generate the Firebase configuration from environment variables during deployment.
