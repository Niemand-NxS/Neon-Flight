<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Neon Velocity

A static Vite/React game that can be hosted on GitHub Pages. It does not need
an API key or a server.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Deploy to GitHub Pages

1. Create a GitHub repository and upload this project's contents.
2. In the repository, open **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. Push to the `main` branch. The included workflow builds and deploys the site.

The Vite configuration uses relative URLs, so it works for both a
`username.github.io` repository and a normal project repository.
