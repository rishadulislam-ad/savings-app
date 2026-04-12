#!/bin/bash
# Fix SPM issues that block iOS builds:
#
# 1. Identity collision: @capacitor-firebase/app-check directory name "app-check"
#    collides with firebase-ios-sdk's dependency on google/app-check.git.
#    Fix: symlink under a unique name + patch CapApp-SPM/Package.swift.
#
# 2. Version range: @capacitor-community/apple-sign-in pins capacitor-swift-pm
#    to "from: 7.0.0" (= 7.x only), but our project uses 8.x.
#    Fix: widen range in the plugin's Package.swift.

PROJ_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SYMLINK="$PROJ_ROOT/ios/App/capacitor-firebase-app-check"
TARGET="../../node_modules/@capacitor-firebase/app-check"
PKG_SWIFT="$PROJ_ROOT/ios/App/CapApp-SPM/Package.swift"
APPLE_PKG="$PROJ_ROOT/node_modules/@capacitor-community/apple-sign-in/Package.swift"

# --- Fix 1: App Check identity collision ---
if [ ! -L "$SYMLINK" ]; then
  ln -s "$TARGET" "$SYMLINK"
  echo "[fix-spm] Created app-check symlink"
else
  echo "[fix-spm] App-check symlink OK"
fi

if grep -q '../../../node_modules/@capacitor-firebase/app-check' "$PKG_SWIFT" 2>/dev/null; then
  sed -i '' 's|../../../node_modules/@capacitor-firebase/app-check|../capacitor-firebase-app-check|g' "$PKG_SWIFT"
  echo "[fix-spm] Patched CapApp-SPM path for app-check"
else
  echo "[fix-spm] CapApp-SPM path already correct"
fi

# --- Fix 2: Apple Sign-In version range ---
if [ -f "$APPLE_PKG" ]; then
  if grep -q 'from: "7.0.0"' "$APPLE_PKG" 2>/dev/null; then
    sed -i '' 's|from: "7.0.0"|"7.0.0"..<"10.0.0"|g' "$APPLE_PKG"
    echo "[fix-spm] Widened apple-sign-in capacitor-swift-pm range"
  else
    echo "[fix-spm] Apple Sign-In range already correct"
  fi
fi
