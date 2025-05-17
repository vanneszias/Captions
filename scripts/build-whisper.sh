#!/bin/bash
set -e

WHISPER_VERSION="v1.7.5"
WHISPER_DIR="whisper.cpp"
OUT_DIR="src-tauri/gen/whisper-bin"
OUT_BIN="$OUT_DIR/whisper"

# Clone if not present
if [ ! -d "$WHISPER_DIR" ]; then
  git clone --depth 1 --branch $WHISPER_VERSION https://github.com/ggml-org/whisper.cpp.git $WHISPER_DIR
fi

# Build
export MACOSX_DEPLOYMENT_TARGET=10.15
cd $WHISPER_DIR
make
cd ..

# Copy binary
mkdir -p $OUT_DIR
cp $WHISPER_DIR/build/bin/whisper-cli $OUT_BIN
chmod +x $OUT_BIN

echo "whisper.cpp built and binary copied to $OUT_BIN" 