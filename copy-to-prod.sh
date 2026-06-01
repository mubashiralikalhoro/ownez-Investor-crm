#!/bin/bash

set -e

BUILD_DIR="final-build"
ZIP_NAME="final-build.zip"
REMOTE_USER="root"
REMOTE_HOST="31.220.57.10"
REMOTE_PATH="/root/Repos/CRM"

echo "Cleaning old build..."
rm -rf "$BUILD_DIR" "$ZIP_NAME"

echo "Creating build folder..."
mkdir -p "$BUILD_DIR"

echo "Copying files..."
cp -r prisma "$BUILD_DIR/"
cp -r public "$BUILD_DIR/"
cp -r src "$BUILD_DIR/"
cp package.json "$BUILD_DIR/"
cp package-lock.json "$BUILD_DIR/"
cp eslint.config.mjs "$BUILD_DIR/"
cp next.config.ts "$BUILD_DIR/"
cp prisma.config.ts "$BUILD_DIR/"
cp tsconfig.json "$BUILD_DIR/"
cp components.json "$BUILD_DIR/"
cp postcss.config.mjs "$BUILD_DIR/"


echo "Creating zip..."
zip -r "$ZIP_NAME" "$BUILD_DIR"

echo "Copying zip to server..."
scp "$ZIP_NAME" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"

rm -rf "$BUILD_DIR" "$ZIP_NAME"

echo "Done. Uploaded $ZIP_NAME to $REMOTE_HOST:$REMOTE_PATH"