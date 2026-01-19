# ASU TP Systems Website

## Overview
A corporate website for a company specializing in industrial automation (АСУ ТП - Automated Control Systems for Technological Processes). The site showcases their services across multiple industries including housing/utilities, food production, engineering, oil & gas, and logistics.

## Project Structure
- `server.js` - Express server that serves static HTML files and handles the chat API
- `index.html` - Main landing page
- `asu-tp-zhkh.html` - Housing/utilities sector page
- `pischevaya-promyshlennost.html` - Food industry page
- `mashinostroenie.html` - Engineering page
- `neftegazservis.html` - Oil & gas page
- `logistika.html` - Logistics page
- `api/chat.js` - Original Vercel serverless function (for reference)
- `vercel.json` - Original Vercel configuration (for reference)

## Tech Stack
- Node.js 20 with Express
- Static HTML/CSS/JavaScript frontend
- Perplexity AI API for chatbot functionality

## URL Routes
The server implements clean URL routing:
- `/zhkh` -> `asu-tp-zhkh.html`
- `/food` -> `pischevaya-promyshlennost.html`
- `/engineering` -> `mashinostroenie.html`
- `/oil-gas` -> `neftegazservis.html`
- `/logistics` -> `logistika.html`

## API Endpoints
- `POST /api/chat` - AI chatbot endpoint (requires PERPLEXITY_API_KEY secret)

## Environment Variables
- `PERPLEXITY_API_KEY` - Required for the AI chatbot functionality

## Running the App
```
node server.js
```
The server runs on port 5000.

## Deployment
Configured for autoscale deployment with `node server.js` as the run command.
