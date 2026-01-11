# LeRobot Dataset Visualizer - Setup Guide

A Next.js web application for visualizing LeRobot robotics datasets from HuggingFace.

## Features

- 🌐 **HuggingFace Integration** - Access datasets directly from HuggingFace (default)
- 📁 **Local dataset support** - Optional: Store datasets locally for offline access
- 🎥 **Multi-camera video playback** - Synchronized views
- 📊 **Interactive data charts** - Sensor and control signal visualization
- ⌨️ **Keyboard shortcuts** - Fast navigation

---

## Quick Start (Remote Mode - Default)

This is the default mode, designed for HuggingFace deployment.

### 1. Setup Node.js (using nvm)

```bash
# Install nvm if you haven't already
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart your terminal or run:
source ~/.bashrc  # or ~/.zshrc for zsh

# Install and use Node.js v20 (recommended)
nvm install 20
nvm use 20

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

Or if you already have nvm:

```bash
# Use the version specified in .nvmrc
nvm use

# Install if not present
nvm install
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Start the Server

```bash
npm run dev
```

### 4. Access Datasets

Open your browser to:
```
http://localhost:3000/<org>/<dataset>/episode_0
```

Example (public dataset):
```
http://localhost:3000/lerobot/aloha_static_cups_open/episode_0
```

**That's it!** The app will fetch datasets directly from HuggingFace.

---

## Working with Private Datasets (Remote)

For private HuggingFace datasets, you need an access token.

### 1. Get Access to the Dataset

1. Visit the dataset page on HuggingFace
2. Login to your HuggingFace account
3. Click "Access repository" and accept the terms

### 2. Get Your HuggingFace Token

1. Go to: https://huggingface.co/settings/tokens
2. Create a new token with "Read" permission
3. Copy the token (starts with `hf_...`)

### 3. Add Token to Environment

Create or edit `.env.local`:

```bash
NEXT_PUBLIC_HF_TOKEN=hf_your_token_here
```

### 4. Restart the Server

```bash
npm run dev
```

Now you can access your private datasets!

---

## Optional: Local Dataset Mode

If you want to work offline or with locally stored datasets, you can enable local mode.

### 1. Setup Python Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install HuggingFace Hub
pip install huggingface_hub
```

### 2. Download Dataset Locally

```bash
# Activate venv
source venv/bin/activate

# Run the download script
python3 scripts/download-dataset.py <org> <dataset>

# Example:
python3 scripts/download-dataset.py lerobot aloha_static_cups_open
```

The dataset will be downloaded to: `./public/datasets/<org>/<dataset>/`

For more download options, see the [Local Dataset Guide](#local-dataset-download-options) below.

### 3. Enable Local Mode

Edit `.env.local`:

```bash
# Enable local dataset mode
USE_LOCAL_DATASETS=true
LOCAL_DATASETS_PATH=./public/datasets

# Optional: Token for fallback to remote if local not found
NEXT_PUBLIC_HF_TOKEN=hf_your_token_here
```

### 4. Restart Server

```bash
npm run dev
```

Now the app will check local datasets first, then fall back to remote if not found.

---

## How It Works

### Remote Mode (Default)
1. User requests dataset
2. Fetch directly from HuggingFace
3. Display videos and data

**Perfect for:**
- HuggingFace deployments
- Public datasets
- Quick prototyping
- No local storage needed

### Local Mode (Optional)
1. User requests dataset
2. Check `./public/datasets/{org}/{dataset}/` first
3. If found locally: Use local files (fast, offline)
4. If not found: Fall back to HuggingFace
5. Display videos and data

**Perfect for:**
- Offline work
- Private datasets
- Fast repeated access
- Large datasets

---

## Configuration Options

### Environment Variables

`.env.local` configuration:

```bash
# === Remote Mode (Default) ===
DATASET_URL=https://huggingface.co/datasets
NEXT_PUBLIC_HF_TOKEN=hf_your_token_here  # For private datasets

# === Local Mode (Optional) ===
# USE_LOCAL_DATASETS=true
# LOCAL_DATASETS_PATH=./public/datasets
```

### Node.js Version (nvm)

This project uses Node.js v20 (specified in `.nvmrc`).

**Install nvm:**
```bash
# macOS/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or:
source ~/.bashrc  # or ~/.zshrc
```

**Use Node.js v20:**
```bash
# Automatic (reads .nvmrc)
nvm use

# Manual
nvm install 20
nvm use 20

# Set as default
nvm alias default 20
```

**Verify:**
```bash
node --version  # Should show v20.x.x
```

---

## Local Dataset Download Options

If you've enabled local mode, here are different ways to download datasets:

### Option A: Using Python Script (Recommended)

```bash
# Activate venv
source venv/bin/activate

# Run the interactive script
python3 scripts/download-dataset.py <org> <dataset>
```

The script will prompt you for your HuggingFace token if needed.

### Option B: Using Python Directly

```bash
# Activate venv
source venv/bin/activate

# Set your token (for private datasets)
export HF_TOKEN=hf_your_token_here

# Download
python3 -c "
from huggingface_hub import snapshot_download, login
login(token='$HF_TOKEN')
snapshot_download(
    repo_id='<org>/<dataset>',
    repo_type='dataset',
    local_dir='./public/datasets/<org>/<dataset>'
)
"
```

### Option C: Using huggingface-cli

```bash
# Activate venv
source venv/bin/activate

# Login (for private datasets)
huggingface-cli login

# Download
huggingface-cli download \
  <org>/<dataset> \
  --repo-type dataset \
  --local-dir ./public/datasets/<org>/<dataset>
```

Alternatively, use the bash script:
```bash
bash scripts/download-dataset.sh <org> <dataset>
```

---

## Dataset File Structure (Local Mode)

When using local mode, datasets should have this structure:

```
public/datasets/
└── <org>/
    └── <dataset>/
        ├── meta/
        │   ├── info.json              # Dataset metadata
        │   ├── episodes/              # Episode metadata (v3.0)
        │   └── tasks.parquet          # Task descriptions
        ├── data/
        │   └── chunk-000/
        │       ├── episode_000000.parquet
        │       ├── episode_000001.parquet
        │       └── ...
        └── videos/
            └── chunk-000/
                ├── observation.images.top/
                │   ├── episode_000000.mp4
                │   └── ...
                ├── observation.images.left/
                │   └── episode_000000.mp4
                └── observation.images.right/
                    └── episode_000000.mp4
```

### Key Files:

- **`meta/info.json`** - Dataset configuration, features, FPS, paths
- **`data/chunk-XXX/episode_NNNNNN.parquet`** - Episode data (observations, actions, timestamps)
- **`videos/chunk-XXX/{camera}/episode_NNNNNN.mp4`** - Video files per camera

---

## Keyboard Shortcuts

While viewing an episode:

- **Space** - Play/Pause videos
- **↑ Arrow Up** - Previous episode
- **↓ Arrow Down** - Next episode

---

## Troubleshooting

### Dataset Not Found (Remote Mode)

**Error**: "Failed to load dataset"

**Solution**:
1. Check the dataset exists on HuggingFace
2. For private datasets, ensure you have:
   - Access to the dataset
   - Valid token in `.env.local`
3. Check browser console for specific errors

### Dataset Not Found (Local Mode)

**Error**: "Failed to load dataset"

**Solution**:
1. Check the dataset path exists:
   ```bash
   ls -la public/datasets/<org>/<dataset>/meta/info.json
   ```
2. Verify the file structure matches the expected layout
3. Ensure `USE_LOCAL_DATASETS=true` in `.env.local`

### Videos Not Loading

**Error**: Videos show loading spinner forever

**Solution**:
1. Check browser console for errors
2. For private datasets, ensure token is set
3. For local mode, verify video files exist
4. Try with a different episode

### Port Already in Use

**Error**: "Port 3000 is already in use"

**Solution**:
```bash
# Kill existing process
kill -9 $(lsof -t -i:3000)

# Or use different port
PORT=3001 npm run dev
```

### Clear Cache

If you see stale data or errors:

```bash
rm -rf .next
npm run dev
```

### Python Module Issues (Local Mode Only)

If `huggingface-cli` doesn't work:

```bash
# Recreate virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade huggingface_hub

# Use Python script instead
python3 scripts/download-dataset.py <org> <dataset>
```

---

## Dataset Versions Supported

This visualizer supports LeRobot dataset versions:
- ✅ **v3.0** (latest)
- ✅ **v2.1**
- ✅ **v2.0**

Check your dataset version in `meta/info.json`:
```json
{
  "codebase_version": "v3.0",
  ...
}
```

---

## Additional Commands

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm start           # Start production server

# Maintenance
npm run lint        # Run linter
```

---

## Example Datasets

Public datasets you can try (work in both modes):

**Remote Mode (default):**
```
http://localhost:3000/lerobot/aloha_static_cups_open/episode_0
http://localhost:3000/lerobot/pusht/episode_0
http://localhost:3000/lerobot/aloha_mobile_cabinet/episode_0
```

**Local Mode (after downloading):**
```bash
source venv/bin/activate
python3 scripts/download-dataset.py lerobot aloha_static_cups_open
python3 scripts/download-dataset.py lerobot pusht
python3 scripts/download-dataset.py lerobot aloha_mobile_cabinet
```

Then access at the same URLs above.

---

## Project Structure

```
lerobot-dataset-visualizer/
├── scripts/
│   ├── download-dataset.py  # Python download script
│   └── download-dataset.sh  # Bash download script
├── public/
│   └── datasets/            # Local datasets (optional)
│       └── {org}/{dataset}/
├── src/
│   ├── app/                 # Next.js pages
│   ├── components/          # React components  
│   ├── context/             # React context
│   └── utils/               # Utility functions
├── venv/                    # Python venv (git-ignored, optional)
├── .env.local               # Environment config (git-ignored)
├── .nvmrc                   # Node.js version
├── package.json             # Node.js dependencies
└── README.md                # Project overview
```

---

## Support

- **Project**: [huggingface/lerobot](https://github.com/huggingface/lerobot)
- **Original Author**: [@Mishig25](https://github.com/mishig25)
- **Dataset Format**: [LeRobot Documentation](https://huggingface.co/docs/lerobot)

---

## License

See LICENSE file for details.
