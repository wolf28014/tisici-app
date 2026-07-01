#!/bin/bash
# 把生成的图标资源拷贝到 Android 项目对应目录
set -e

PROJ=/home/z/my-project/prompthub-android
SRC=$PROJ/android-resources
ANDROID_RES=$PROJ/android/app/src/main/res

# 1. 主图标到各 mipmap 密度（覆盖默认的 Capacitor 图标）
declare -A DENSITY_TO_PX=(
  ["mdpi"]=48
  ["hdpi"]=72
  ["xhdpi"]=96
  ["xxhdpi"]=144
  ["xxxhdpi"]=192
)
for DENSITY in "${!DENSITY_TO_PX[@]}"; do
  PX=${DENSITY_TO_PX[$DENSITY]}
  SRC_FILE=$SRC/ic_launcher_${DENSITY}.png
  DST_DIR=$ANDROID_RES/mipmap-$DENSITY
  mkdir -p $DST_DIR
  cp -f $SRC_FILE $DST_DIR/ic_launcher.png
  cp -f $SRC_FILE $DST_DIR/ic_launcher_round.png
  echo "  $DENSITY: $DST_DIR/ic_launcher.png (${PX}x${PX})"
done

# 2. Adaptive icon foreground / background 到 mipmap-anydpi-v26
ADAPTIVE_DIR=$ANDROID_RES/mipmap-anydpi-v26
mkdir -p $ADAPTIVE_DIR
# 拷贝前景和背景到 drawable
mkdir -p $ANDROID_RES/drawable
cp -f $SRC/ic_launcher_foreground.png $ANDROID_RES/drawable/ic_launcher_foreground.png
cp -f $SRC/ic_launcher_background.png $ANDROID_RES/drawable/ic_launcher_background.png

# 写 adaptive icon XML
cat > $ADAPTIVE_DIR/ic_launcher.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
EOF

cat > $ADAPTIVE_DIR/ic_launcher_round.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
EOF

echo "Adaptive icon XML 已写入 $ADAPTIVE_DIR"

# 3. Splash 屏到 drawable
mkdir -p $ANDROID_RES/drawable
cp -f $SRC/splash.png $ANDROID_RES/drawable/splash.png

# 写 splash XML（让 splash 图片以居中、保持比例方式显示在紫色背景上）
cat > $ANDROID_RES/drawable/splash.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/ic_launcher_background_color"/>
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/splash"/>
    </item>
</layer-list>
EOF

# 写颜色资源
mkdir -p $ANDROID_RES/values
cat > $ANDROID_RES/values/colors.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background_color">#7C3AED</color>
    <color name="ic_launcher_foreground_color">#FFFFFF</color>
</resources>
EOF

echo "Splash 资源已写入 $ANDROID_RES/drawable/splash.xml"
echo ""
echo "✅ 所有图标资源已就位"
