# Speech-to-Text Troubleshooting Guide

## Error: StatusCode: 1006 - Unable to contact server

This error indicates that the WebSocket connection to Azure Speech Services cannot be established.

### Common Causes & Solutions:

#### 1. **Network/Firewall Issues**
   - **Problem**: Your network or firewall is blocking WebSocket connections
   - **Solution**: 
     - Try a different network (mobile hotspot, different WiFi)
     - Check if your firewall/antivirus is blocking WebSocket connections
     - If on a corporate network, contact IT to allow connections to `*.speech.microsoft.com`

#### 2. **Azure Region/Endpoint Issues**
   - **Problem**: The specified region might be incorrect or unreachable
   - **Solution**:
     - Verify your Azure region is correct (e.g., "westeurope", "eastus")
     - Try a different region closer to your location
     - Check Azure service status: https://status.azure.com/

#### 3. **API Key Issues**
   - **Problem**: Invalid or expired API key
   - **Solution**:
     - Verify your API key in Azure Portal
     - Ensure the key is for Speech Services (not another service)
     - Check if the key has expired or been regenerated

#### 4. **Browser Compatibility**
   - **Problem**: Browser doesn't support WebSocket or has restrictions
   - **Solution**:
     - Use Chrome, Edge, or Firefox (Safari may have issues)
     - Check browser console for additional errors
     - Try disabling browser extensions that might block WebSocket

#### 5. **CORS/HTTPS Requirements**
   - **Problem**: Azure Speech SDK requires HTTPS in production
   - **Solution**:
     - For local development, use `http://localhost` (should work)
     - For production, ensure you're using HTTPS
     - Check browser console for CORS errors

### Testing Steps:

1. **Check Microphone Permissions**:
   - Open browser console (F12)
   - Click the microphone button
   - Look for "✅ Microphone permission granted" message

2. **Check Network Connection**:
   - Open browser DevTools → Network tab
   - Filter by "WS" (WebSocket)
   - Click microphone button
   - Check if WebSocket connection attempts appear
   - Look for failed connections (red status)

3. **Verify Azure Credentials**:
   - Check console for "📍 Region:" and "🔑 Key:" messages
   - Verify the region matches your Azure resource location
   - Ensure the key is correct

4. **Test with Different Browser**:
   - Try Chrome (most compatible)
   - Try Edge (also good)
   - Avoid Safari if possible

### Alternative Solutions:

If the issue persists, you might need to:
1. Use Azure Speech SDK token authentication instead of direct key
2. Set up a proxy server for WebSocket connections
3. Use Azure Speech Services REST API instead of WebSocket SDK
4. Check with your network administrator about WebSocket policies

### Getting Help:

If none of these solutions work:
1. Check Azure Speech Services status page
2. Review Azure Speech SDK documentation
3. Check browser console for detailed error messages
4. Verify your Azure subscription and resource are active

