#!/bin/bash
# Download LeRobot dataset locally
# Usage: ./download-dataset.sh <org> <dataset>
# Example: ./download-dataset.sh lerobot aloha_static_cups_open

set -e

ORG=$1
DATASET=$2

if [ -z "$ORG" ] || [ -z "$DATASET" ]; then
    echo "📋 Usage: ./download-dataset.sh <org> <dataset>"
    echo ""
    echo "Examples:"
    echo "  ./download-dataset.sh lerobot aloha_static_cups_open"
    echo "  ./download-dataset.sh your-org your-dataset"
    echo ""
    exit 1
fi

TARGET_DIR="./public/datasets/$ORG/$DATASET"

echo "🤖 LeRobot Dataset Downloader"
echo "=============================="
echo ""
echo "Dataset: $ORG/$DATASET"
echo "Target: $TARGET_DIR"
echo ""

# Check if huggingface-cli is installed
if ! command -v huggingface-cli &> /dev/null; then
    echo "❌ huggingface-cli not found!"
    echo ""
    echo "Install it with:"
    echo "  pip install huggingface_hub"
    echo ""
    exit 1
fi

echo "✅ huggingface-cli found"
echo ""

# Check if user is logged in (for private datasets)
echo "🔐 Checking HuggingFace authentication..."
if ! huggingface-cli whoami &> /dev/null; then
    echo "⚠️  Not logged in to HuggingFace"
    echo ""
    echo "For private datasets, login first:"
    echo "  huggingface-cli login"
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    USER=$(huggingface-cli whoami | head -n 1)
    echo "✅ Logged in as: $USER"
fi

echo ""
echo "📥 Downloading dataset..."
echo "This may take a while depending on dataset size..."
echo ""

# Download the dataset
huggingface-cli download \
  $ORG/$DATASET \
  --repo-type dataset \
  --local-dir "$TARGET_DIR"

echo ""
echo "✅ Download complete!"
echo ""
echo "📁 Dataset location: $TARGET_DIR"
echo ""
echo "📋 Next steps:"
echo "1. Start the server: npm run dev"
echo "2. Open: http://localhost:3000/$ORG/$DATASET/episode_0"
echo ""
echo "🎉 Happy visualizing!"
