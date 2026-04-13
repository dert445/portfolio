# Cosmic Terminal v2.0 - 3D Interactive Portfolio

A highly immersive, 3D scrollytelling space-themed developer portfolio built with React, Three.js (`@react-three/fiber`), and GSAP. 

## 🚀 Features & Animations
* **Guided Autopilot Tour:** A seamless, automated cinematic flight sequence that moves through all planetary project nodes, automatically expanding dynamic data overlays, utilizing math-driven GSAP calculations and strict React state management.
* **Procedural 3D Node Rendering:** Uses Three.js `Line` components to draw cyberpunk-styled bent networking cables tying 3D space targets to complex 2D HTML project overlays.
* **Volumetric Atmosphere:** Includes tens of thousands of ambient star particles built programmatically on canvas load alongside planetary rings and atmospheric glows.
* **Direct Action Protocols:** Implements safe HTML mailto handling through a custom built internal React texting terminal to establish fast, direct contact.
* **Cinematic Music Engine:** A tightly controlled autoplay workaround system for browser media restrictions that gracefully integrates the background music as soon as the user interacts with the terminal entry screen.

## 🕹️ User Controls
* **Take Guided Tour:** Completely removes manual control and lets the web app automatically guide the user through the portfolio features.
* **Voyage Mode (`Z`):** The default cinematic mode. Use your mouse wheel to scroll down or up vertically to automatically guide the camera to different planetary bodies spread across thousands of depth units. 
* **Gallery Mode (`X`):** Overrides the scrolling layout and arrays all planets beautifully in an off-center grid so they can be viewed simultaneously in wide-screen formats. Hover to reveal details.
* **Stack Mode (`Y`):** Aligns the planets into a direct vertical alignment similar to standard web applications. Hover to reveal details.
* **Node Expansion:** Physically clicking on any planet expands intricate detail nodes outlining the technologies utilized, direct links to GitHub repositories, and deep architectural descriptions.

## 📦 Deployment Process

### Prerequisites
Make sure you have Node.js and npm installed on your system.

### Local Development
1. First, install all core dependencies (React, Three.js, Fiber, GSAP) by running:
   ```bash
   npm install
   ```
2. Start the local Vite development server:
   ```bash
   npm run dev
   ```

### Production Build
To create a high-performance production build, simply run:
```bash
npm run build
```
This will compile and minify all WebGL assets, scripts, and CSS into a highly optimized `dist/` folder.

### Hosting (Vercel / Netlify / GitHub Pages)
Because this application is perfectly bundled into static assets, it can be deployed extremely easily:
1. Push your code to your GitHub Repository.
2. Sign into a service like **Vercel** or **Netlify** and import your repository.
3. The platform will automatically detect Vite. Make sure the Build Command is `npm run build` and the Publish Directory is `dist`.
4. Click Deploy! Your 3D terminal is now live on the internet.
