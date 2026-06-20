# GIPHY API Key Setup Guide

## Quick Setup (3 Steps)

### Step 1: Get Your Free GIPHY API Key

1. Go to: **https://developers.giphy.com/**
2. Click **"Create an App"** or **"Get Started"**
3. Sign up (free) or log in
4. Create a new app (choose "SDK" or "API")
5. Copy your API key (looks like: `AbCdEfGhIjKlMnOpQrStUvWxYz123456`)

### Step 2: Create .env File

In your project root directory (`/Users/raghav/hear me webpage/`), create a file named `.env`

**On Mac/Linux:**
```bash
touch .env
```

**On Windows:**
Create a new file named `.env` (no extension)

### Step 3: Add Your API Key

Open the `.env` file and add:

```
VITE_GIPHY_API_KEY=your_actual_api_key_here
```

**Replace `your_actual_api_key_here` with your actual key from Step 1**

Example:
```
VITE_GIPHY_API_KEY=AbCdEfGhIjKlMnOpQrStUvWxYz123456
```

### Step 4: Restart Dev Server

**Important:** After creating/updating `.env`, you MUST restart your dev server:

1. Stop your current server (Ctrl+C or Cmd+C)
2. Start it again: `npm run dev`

## Verify It Works

1. Navigate to: `http://localhost:5173/#/sign-gif-test`
2. Type: `hello`
3. Click "Play Sign Language"
4. You should see a GIF playing (no error message)

## Troubleshooting

### Still seeing "API key not configured"?
- ✅ Check `.env` file is in the project root (same folder as `package.json`)
- ✅ Check the variable name is exactly: `VITE_GIPHY_API_KEY`
- ✅ Check there are no spaces around the `=` sign
- ✅ **Restart your dev server** after creating/editing `.env`
- ✅ Make sure you didn't add quotes around the key value

### Getting API errors?
- Check your API key is correct
- Make sure your GIPHY account is active
- Free tier allows 42 requests per hour

## Need Help?

- GIPHY API Docs: https://developers.giphy.com/docs/
- GIPHY Support: https://support.giphy.com/






