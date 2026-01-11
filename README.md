# LeRobot Dataset Visualizer

LeRobot Dataset Visualizer is a web application for interactive exploration and visualization of robotics datasets, particularly those in the LeRobot format. It enables users to browse, view, and analyze episodes from large-scale robotics datasets, combining synchronized video playback with rich, interactive data graphs.

## Project Overview

This tool is designed to help robotics researchers and practitioners quickly inspect and understand large, complex datasets. It fetches dataset metadata and episode data (including video and sensor/telemetry data), and provides a unified interface for:

- Navigating between organizations, datasets, and episodes
- Watching episode videos
- Exploring synchronized time-series data with interactive charts
- Paginating through large datasets efficiently

## Key Features

- **Dataset & Episode Navigation:** Quickly jump between organizations, datasets, and episodes using a sidebar and navigation controls.
- **Synchronized Video & Data:** Video playback is synchronized with interactive data graphs for detailed inspection of sensor and control signals.
- **Efficient Data Loading:** Uses parquet and JSON loading for large dataset support, with pagination and chunking.
- **HuggingFace Integration:** Direct access to datasets hosted on HuggingFace (default mode).
- **Optional Local Mode:** Store datasets locally for offline access and faster repeated loads.
- **Responsive UI:** Built with React, Next.js, and Tailwind CSS for a fast, modern user experience.

## Technologies Used

- **Next.js** (App Router)
- **React**
- **Recharts** (for data visualization)
- **hyparquet** (for reading Parquet files)
- **Tailwind CSS** (styling)

## Getting Started

See **[SETUP.md](SETUP.md)** for detailed installation and configuration instructions.

### Quick Start (Remote Mode - Default)

This is the default mode, perfect for HuggingFace deployments and public datasets.

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Access any public dataset directly:
```
http://localhost:3000/lerobot/aloha_static_cups_open/episode_0
http://localhost:3000/lerobot/pusht/episode_0
```

### Private Datasets

For private HuggingFace datasets, add your token to `.env.local`:

```bash
NEXT_PUBLIC_HF_TOKEN=hf_your_token_here
```

Then restart the server:
```bash
npm run dev
```

### Optional: Local Dataset Mode

For offline access or faster repeated loads, you can download datasets locally.

See **[SETUP.md](SETUP.md)** for detailed instructions on:
- Setting up Python virtual environment
- Downloading datasets with `scripts/download-dataset.py`
- Enabling local mode with `USE_LOCAL_DATASETS=true`

## Features

### Remote Mode (Default)
- ✅ Works out of the box with public datasets
- ✅ Direct HuggingFace integration
- ✅ No setup required
- ✅ Perfect for HuggingFace deployments

### Local Mode (Optional)
- ✅ Offline access
- ✅ Faster repeated loads
- ✅ Private data stays on your machine
- ✅ Automatic fallback to remote if not found

## Development

You can start editing the page by modifying `src/app/page.tsx` or other files in the `src/` directory. The app supports hot-reloading for rapid development.

### Environment Variables

Create `.env.local` in the root directory:

```bash
# Remote mode (default) - works out of the box
DATASET_URL=https://huggingface.co/datasets

# For private datasets, add your token:
NEXT_PUBLIC_HF_TOKEN=hf_your_token_here

# Optional: Enable local dataset mode
# USE_LOCAL_DATASETS=true
# LOCAL_DATASETS_PATH=./public/datasets
```

See `.env.example` for configuration template.

### Additional Commands

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm start           # Start production server

# Maintenance
npm run lint        # Run linter
```

## Project Structure

```
lerobot-dataset-visualizer/
├── scripts/
│   ├── download-dataset.py  # Python script for downloading datasets
│   └── download-dataset.sh  # Bash script for downloading datasets
├── src/
│   ├── app/                 # Next.js pages (App Router)
│   ├── components/          # React components
│   ├── context/            # React context (time sync)
│   └── utils/              # Utilities (parquet, versioning)
├── public/
│   └── datasets/           # Local datasets (optional, git-ignored)
├── .env.local              # Environment config (git-ignored)
├── .nvmrc                 # Node.js version (v20)
├── package.json           # Dependencies
├── SETUP.md              # Comprehensive setup guide
└── README.md            # This file
```

## Keyboard Shortcuts

While viewing an episode:
- **Space** - Play/Pause videos
- **↑ Arrow Up** - Previous episode
- **↓ Arrow Down** - Next episode

## Documentation

- **[SETUP.md](SETUP.md)** - Comprehensive setup guide including:
  - Node.js setup with nvm
  - Remote mode (default)
  - Local mode setup (optional)
  - Python virtual environment
  - Downloading datasets
  - Troubleshooting

## Contributing

Contributions, bug reports, and feature requests are welcome! Please open an issue or submit a pull request.

### Acknowledgement 
The app was orignally created by [@Mishig25](https://github.com/mishig25) and taken from this PR [#1055](https://github.com/huggingface/lerobot/pull/1055)
