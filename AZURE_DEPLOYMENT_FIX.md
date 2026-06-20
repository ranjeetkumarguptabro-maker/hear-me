# Azure Backend Deployment Fix

## Problem
Azure is building from repository root, but backend code is in `backend/` subfolder.

## Solution: Configure Azure App Settings

### Step 1: Set Project Path
1. Go to Azure Portal → Your App Service (hearme-backend-api)
2. Left menu → **Configuration**
3. Click **Application settings** tab
4. Click **+ New application setting**
5. Add:
   - **Name**: `PROJECT`
   - **Value**: `backend`
6. Click **OK**
7. Click **Save** at the top
8. Click **Continue** when prompted

### Step 2: Set Build Setting
1. Still in **Application settings**
2. Click **+ New application setting**
3. Add:
   - **Name**: `SCM_DO_BUILD_DURING_DEPLOYMENT`
   - **Value**: `true`
4. Click **OK**
5. Click **Save** at the top

### Step 3: Set Startup Command
1. Go to **Configuration** → **General settings** tab
2. Find **Startup Command**
3. Enter:
   ```
   gunicorn -k uvicorn.workers.UvicornWorker main:app --bind=0.0.0.0:8000 --timeout=600
   ```
4. Click **Save**

### Step 4: Verify Python Version
1. Still in **General settings**
2. Check:
   - **Stack**: Python
   - **Major version**: 3.10
3. Click **Save** if changed

### Step 5: Redeploy
1. Go to **Deployment Center**
2. Click **Sync** button
3. Wait 3-5 minutes for deployment

## Alternative: If PROJECT setting doesn't work

Create a startup script that changes to backend directory before starting.

