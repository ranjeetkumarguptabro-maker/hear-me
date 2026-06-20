# Text → Sign Language GIF Test Page

## Overview

This is a **test/sandbox page** for converting text to Sign Language GIFs using "Sign with Robert" from GIPHY.

**⚠️ This is experimental and separate from the main communication page.**

## Setup

### 1. Get GIPHY API Key

1. Go to [GIPHY Developers](https://developers.giphy.com/)
2. Create an account or sign in
3. Create a new app
4. Copy your API key

### 2. Configure Environment Variable

Create a `.env` file in the root directory:

```bash
VITE_GIPHY_API_KEY=your_actual_api_key_here
```

**Important:** Replace `your_actual_api_key_here` with your actual GIPHY API key.

### 3. Access the Test Page

Navigate to:
```
http://localhost:5173/#/sign-gif-test
```

Or add a link in your app that navigates to this route.

## How It Works

1. **Input**: User types text (e.g., "hello how are you")
2. **Processing**:
   - Text is converted to lowercase
   - Split into individual words
   - Each word is searched on GIPHY
   - Results are filtered to only include GIFs from `@signwithrobert`
3. **Output**: GIFs play sequentially, one word at a time (3 seconds each)

## Features

- ✅ Text input with Enter key support
- ✅ Sequential GIF playback (one word at a time)
- ✅ Current word indicator
- ✅ Progress tracking
- ✅ Word list with active highlighting
- ✅ Error handling for missing GIFs
- ✅ Stop button to halt playback

## Example Usage

1. Type: `hello sorry thank you`
2. Click "Play Sign Language"
3. Watch as 3 GIFs play in sequence:
   - "HELLO" GIF plays for 3 seconds
   - "SORRY" GIF plays for 3 seconds
   - "THANK YOU" GIF plays for 3 seconds

## API Details

- **Endpoint**: GIPHY Search API
- **Creator Filter**: `username=signwithrobert`
- **Rating**: G (safe for all audiences)
- **Limit**: 10 results per word

## Troubleshooting

### "GIPHY API key not found"
- Make sure you created a `.env` file
- Ensure the variable is named `VITE_GIPHY_API_KEY`
- Restart your dev server after adding the `.env` file

### "No GIFs found"
- The word might not exist in Sign with Robert's library
- Try common words like: hello, thank you, sorry, yes, no
- Check browser console for detailed error messages

### GIFs not playing
- Check your internet connection
- Verify GIPHY API key is valid
- Check browser console for errors

## Notes

- This is a **test page only** - not integrated into main app
- GIFs are fetched in real-time from GIPHY
- Only GIFs from "Sign with Robert" are used
- Missing words are skipped (shown as "no GIF" badge)






