#!/bin/bash
# 后台构建 Android APK
# 用法：nohup bash build_apk.sh > build.log 2>&1 &

set -e

PROJ=/home/z/my-project/prompthub-android
export ANDROID_HOME=/home/z/my-project/android-sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

cd $PROJ

# 1. 重新构建 Next.js 静态产物（保证最新）
echo "[$(date)] Building Next.js static export..."
npx next build 2>&1 | tail -5

# 2. 同步到 Android
echo "[$(date)] Syncing Capacitor..."
npx cap sync android 2>&1 | tail -5

# 3. 构建 APK
echo "[$(date)] Building APK (this may take several minutes)..."
cd android
./gradlew assembleDebug --no-daemon --max-workers=2 -Dorg.gradle.jvmargs="-Xmx2g -XX:MaxMetaspaceSize=512m" 2>&1 | tail -50

# 4. 复制 APK 到 download 目录
APK=app/build/outputs/apk/debug/app-debug.apk
if [ -f $APK ]; then
  mkdir -p /home/z/my-project/download
  cp -f $APK /home/z/my-project/download/PromptHub-debug.apk
  echo "[$(date)] ✅ APK 已生成: /home/z/my-project/download/PromptHub-debug.apk"
  ls -lh /home/z/my-project/download/PromptHub-debug.apk
else
  echo "[$(date)] ❌ APK 构建失败，未找到 $APK"
fi
