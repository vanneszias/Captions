#!/bin/bash
set -e

WHISPER_VERSION="v1.7.5"
WHISPER_DIR="whisper.cpp"
OUT_DIR="src-tauri/gen/whisper-bin"
OUT_BIN="$OUT_DIR/whisper"

# Check if binary already exists
if [ -f "$OUT_BIN" ]; then
  echo "whisper.cpp binary already exists at $OUT_BIN"
  exit 0
fi

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

# Copy dynamic library if it exists
if [ -f "$WHISPER_DIR/build/src/libwhisper.1.dylib" ]; then
  cp "$WHISPER_DIR/build/src/libwhisper.1.dylib" "$OUT_DIR/"
  echo "libwhisper.1.dylib copied to $OUT_DIR/"
else
  echo "Warning: libwhisper.1.dylib not found in $WHISPER_DIR/build/src/"
fi

echo "whisper.cpp built and binary copied to $OUT_BIN" 