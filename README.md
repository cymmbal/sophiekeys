# Interactive 3D Scene with Spline

A demo website that displays interactive 3D scenes created with Spline.

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
   
   For development with auto-restart:
   ```
   npm run dev
   ```

4. Open your browser and navigate to [http://localhost:8000](http://localhost:8000)

## Project Structure

- `/public` - Static files served by Express
  - `/assets/gems` - Spline 3D scene files
  - `index.html` - Main HTML page
  - `styles.css` - CSS styles
  - `index.js` - JavaScript for loading the Spline scene
- `server.js` - Express server setup
- `package.json` - Project dependencies and scripts

## Changing the 3D Scene

To change the displayed 3D scene, modify the file path in `public/index.js`:

```javascript
await spline.load('./assets/gems/your-spline-file.splinecode');
```

Available scenes:
- flying-lotus-cosmogramma.splinecode
- aphex-twin-selected-ambient-works-ii.splinecode
- one-oh-trix-point-never-magic.splinecode 