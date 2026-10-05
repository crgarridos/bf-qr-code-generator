# Basic Fit QR Code Generator

A minimal, TypeScript-based QR code generator that creates time-based QR codes with SHA-256 hash validation. The application runs entirely in the browser with no backend required.

## Features

- 🔐 **SHA-256 Hash Generation** - Secure hash-based QR code validation
- ⏱️ **Auto-refresh** - QR codes regenerate every 5 seconds with updated timestamps
- 🗄️ **SQLite Configuration** - Static card, constant, and device values load from the bundled database; manual edits last for the current session
- 📱 **Mobile-friendly** - Responsive design optimized for all screen sizes
- 🚀 **No Backend Required** - Runs completely client-side
- 🎨 **Clean UI** - Simple, modern interface

## How It Works

The application generates QR codes in the format:

```
GM2:{CARD_NUMBER}:{CONSTANT}:{TIMESTAMP}:{HASH}
```

Where:

- **GM2**: QR code format identifier
- **CARD_NUMBER**: Your card identifier (e.g., V00123456)
- **CONSTANT**: A fixed constant value (e.g., 3M9) that changes everytime you kill & relaunch the BF app.
- **TIMESTAMP**: Unix timestamp (seconds since epoch)
- **HASH**: Last 8 characters of SHA-256 hash (uppercase)

The hash is computed from: `CARD_NUMBER + CONSTANT + TIMESTAMP + DEVICE_ID`

The default card number, constant, and device ID are stored in `data/qr-config.sqlite` and read in the browser with SQL.js. URL parameters can override those defaults; the app does not read from or write to localStorage.

## Views

- The root page opens the QR result automatically when card number, constant, and device ID are available.
- If any required value is missing, the app opens the configuration form.
- Open `/setup/` to access configuration at any time. The **Mode debug** button is available from that screen.

## Running Locally

### Prerequisites

- Node.js 20 or higher
- npm

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd bf-qr-code-generator
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

4. Start the local server:

```bash
npm run dev
```

5. Open [http://localhost:8000](http://localhost:8000).

### Development

The project uses:

- **TypeScript** for type-safe code
- **esbuild** for fast bundling
- **QRCode.js** for QR code generation
- **SQL.js** to read the static SQLite database in the browser

To rebuild after making changes:

```bash
npm run build
```

To change the static defaults, edit `data/schema.sql` and recreate the database:

```bash
sqlite3 data/qr-config.sqlite < data/schema.sql
```

## Project Structure

```
bf-qr-code-generator/
├── data/
│   ├── qr-config.sqlite # Static QR configuration
│   └── schema.sql       # Database schema and seed values
├── setup/
│   └── index.html       # /setup route redirect
├── scripts/
│   ├── build.mjs
│   └── dev.mjs
├── src/
│   └── main.ts
├── dist/                # Bundled JavaScript and SQL.js WASM
├── index.html
├── service-worker.js
├── styles.css
├── package.json
└── tsconfig.json
```

## GitHub Pages Deployment

The project uses GitHub Actions to automatically build and deploy:

1. Push your code to GitHub
2. Go to repository Settings → Pages
3. Under "Build and deployment", select **GitHub Actions** as the source
4. Push to the `main` branch to trigger automatic deployment
5. Your app will be available at `https://<username>.github.io/<repository>/`

The GitHub Action workflow will automatically:

- Install dependencies
- Build the TypeScript code
- Deploy to GitHub Pages

**Note:** The `dist/` folder is not committed to the repository. It's built automatically during deployment.

## Disclaimer

**This project is for educational and demonstration purposes only.**

This QR code generator is **NOT** affiliated with, endorsed by, or intended for actual use in Basic Fit facilities. It is a personal project created solely for learning and educational purposes.

- This tool is **NOT** intended for real-world use in Basic Fit gyms
- The author assumes **NO responsibility** for any misuse of this application
- Any use of this tool in actual Basic Fit facilities is **strictly prohibited**
- Users are solely responsible for any consequences resulting from the use of this software

By using this software, you acknowledge that it is a demonstration project only and agree not to use it for any unauthorized purposes.
