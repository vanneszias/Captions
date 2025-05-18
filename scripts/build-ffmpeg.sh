#!/bin/bash
set -e

FFMPEG_VERSION="n6.1"
FFMPEG_DIR="ffmpeg"
OUT_DIR="src-tauri/gen/ffmpeg-bin"
OUT_BIN="$OUT_DIR/ffmpeg"

# Check if binary already exists
if [ -f "$OUT_BIN" ]; then
  echo "ffmpeg binary already exists at $OUT_BIN"
  exit 0
fi

# Clone if not present
if [ ! -d "$FFMPEG_DIR" ]; then
  git clone --depth 1 --branch $FFMPEG_VERSION https://github.com/FFmpeg/FFmpeg.git $FFMPEG_DIR
fi

# Build
cd $FFMPEG_DIR
./configure --prefix="$(pwd)/build" --disable-shared --enable-static --disable-doc --disable-debug --enable-pic
make -j$(sysctl -n hw.ncpu)
make install
cd ..

# Copy binary
mkdir -p $OUT_DIR
cp $FFMPEG_DIR/build/bin/ffmpeg $OUT_BIN
chmod +x $OUT_BIN

echo "ffmpeg built and binary copied to $OUT_BIN"
