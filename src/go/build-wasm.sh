#!/bin/bash

# WASMビルド用のスクリプト
echo "Building WASM..."

# 出力ディレクトリを作成
mkdir -p ../public/wasm

# WASMファイルを直接public/wasmにビルド
GOOS=js GOARCH=wasm go build -o ../public/wasm/resolver.wasm ./wasm/main.go

