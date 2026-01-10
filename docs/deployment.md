# Deployment Guide

## Split Architecture

The Intent Protocol application uses a **Split Architecture**:
- **Frontend**: A React application (deployed on Vercel).
- **Backend (Relayer)**: A Node.js Fastify server (needs a persistent server environment like Railway, Render, or DigitalOcean).

The Frontend communicates with the Backend via HTTP.

## Deploying the Relayer

The Relayer cannot run on Vercel (serverless) because it maintains in-memory state (order history) and needs to listen for incoming requests consistently.

### Recommended Providers
- **Railway** (Easiest)
- **Render**
- **DigitalOcean App Platform**
- **Heroku**

### Steps
1.  Push your code to GitHub.
2.  Connect your repository to your hosting provider.
3.  Set the **Root Directory** to `packages/intent-relayer`.
4.  Set the **Build Command** to `npm run build`.
5.  Set the **Start Command** to `npm run start`.
6.  (Optional) Set `RELAYER_PRIVATE_KEY` environment variable if you want a specific wallet address.

## Configuring the Frontend

Once your Relayer is deployed, you will get a public URL (e.g., `https://jubilant-nourishment-production.up.railway.app`).

1.  Go to your Vercel Project Settings.
2.  Navigate to **Environment Variables**.
3.  Add a new variable:
    -   **Key**: `VITE_RELAYER_URL`
    -   **Value**: `https://jubilant-nourishment-production.up.railway.app` (or your specific URL)
4.  **Redeploy** the frontend for changes to take effect.

## Troubleshooting

### "System Offline" / Connection Refused
If the UI shows the Relayer is offline:
1.  Check if `VITE_RELAYER_URL` is set in your Vercel settings.
2.  Verify the Relayer is running and healthy by visiting `YOUR_RELAYER_URL/health`.
3.  Ensure the Relayer URL does NOT end with a trailing slash `/` (unless your config handles it, usually safer to omit).

### "Localhost" Errors in Production
If you see errors pointing to `localhost:3001` in a deployed app, it means `VITE_RELAYER_URL` is missing, and the app fell back to the default development configuration.
