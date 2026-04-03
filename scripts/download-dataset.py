#!/usr/bin/env python3
"""
Download LeRobot dataset using Python
Usage: python3 download-dataset.py <org> <dataset>
Example: python3 download-dataset.py huggingface lerobot_example
"""

import sys
import os
from pathlib import Path

def main():
    if len(sys.argv) != 3:
        print("📋 Usage: python3 download-dataset.py <org> <dataset>")
        print()
        print("Examples:")
        print("  python3 download-dataset.py lerobot aloha_static_cups_open")
        print("  python3 download-dataset.py your-org your-dataset")
        print()
        sys.exit(1)
    
    org = sys.argv[1]
    dataset = sys.argv[2]
    target_dir = f"./public/datasets/{org}/{dataset}"
    
    print("🤖 LeRobot Dataset Downloader (Python)")
    print("=" * 42)
    print()
    print(f"Dataset: {org}/{dataset}")
    print(f"Target: {target_dir}")
    print()
    
    # Check if huggingface_hub is installed
    try:
        from huggingface_hub import snapshot_download, login, whoami
        print("✅ huggingface_hub found")
    except ImportError:
        print("❌ huggingface_hub not found!")
        print()
        print("Install it with:")
        print("  pip install huggingface_hub")
        print()
        sys.exit(1)
    
    print()
    print("🔐 Checking HuggingFace authentication...")
    
    # Check if logged in
    try:
        user = whoami()
        print(f"✅ Logged in as: {user['name']}")
    except Exception:
        print("⚠️  Not logged in to HuggingFace")
        print()
        print("For private datasets, you need to login:")
        print()
        
        token = input("Enter your HuggingFace token (or press Enter to skip): ").strip()
        
        if token:
            try:
                login(token=token, add_to_git_credential=True)
                print("✅ Login successful!")
            except Exception as e:
                print(f"❌ Login failed: {e}")
                sys.exit(1)
        else:
            response = input("Continue without authentication? (y/n): ").strip().lower()
            if response != 'y':
                sys.exit(0)
    
    print()
    print("📥 Downloading dataset...")
    print("This may take a while depending on dataset size...")
    print()
    
    try:
        # Download the dataset
        snapshot_download(
            repo_id=f"{org}/{dataset}",
            repo_type="dataset",
            local_dir=target_dir,
            resume_download=True,
        )
        
        print()
        print("✅ Download complete!")
        print()
        print(f"📁 Dataset location: {target_dir}")
        print()
        print("📋 Next steps:")
        print("1. Start the server: npm run dev")
        print(f"2. Open: http://localhost:3000/{org}/{dataset}/episode_0")
        print()
        print("🎉 Happy visualizing!")
        
    except Exception as e:
        print()
        print(f"❌ Download failed: {e}")
        print()
        print("Common issues:")
        print("- You don't have access to this dataset (need to request access on HuggingFace)")
        print("- Wrong dataset name/organization")
        print("- Network issues")
        print()
        sys.exit(1)

if __name__ == "__main__":
    main()
