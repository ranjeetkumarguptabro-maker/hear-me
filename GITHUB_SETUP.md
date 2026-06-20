# GitHub Setup Instructions

Follow these steps to push your project to GitHub:

## Step 1: Initialize Git (if not already done)

```bash
cd "/Users/raghav/hear me webpage"
git init
```

## Step 2: Add All Files

```bash
git add .
```

## Step 3: Create Initial Commit

```bash
git commit -m "Initial commit: Hear-Me communication app with Azure Speech and MediaPipe gesture detection"
```

## Step 4: Create a New Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `hear-me-connect` (or any name you prefer)
3. Description: "Real-time AI-powered communication app for deaf and hearing users"
4. Choose **Public** or **Private**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **Create repository**

## Step 5: Connect and Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/hear-me-connect.git

# Rename main branch if needed
git branch -M main

# Push to GitHub
git push -u origin main
```

## Alternative: Using SSH (if you have SSH keys set up)

```bash
git remote add origin git@github.com:YOUR_USERNAME/hear-me-connect.git
git branch -M main
git push -u origin main
```

## What's Included in the Repository

✅ All source code (React components, CSS, JavaScript)
✅ Package.json with dependencies
✅ README.md with setup instructions
✅ .gitignore (excludes node_modules, .env, build files)
✅ MediaPipe gesture detection
✅ Azure Speech integration
✅ Homepage and Communication page UI

## What's Excluded (via .gitignore)

❌ node_modules/ (will be installed via npm install)
❌ .env files (sensitive credentials)
❌ Build/dist folders
❌ OS-specific files (.DS_Store, etc.)

## After Pushing

1. Your code will be on GitHub
2. Others can clone it with: `git clone https://github.com/YOUR_USERNAME/hear-me-connect.git`
3. They'll need to run `npm install` to install dependencies
4. They'll need their own Azure Speech API key

## Troubleshooting

If you get authentication errors:
- Use GitHub Personal Access Token instead of password
- Or set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

If you get "remote origin already exists":
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/hear-me-connect.git
```

