"""生成 PromptHub 安卓 APP 图标
- 1024x1024 主图标（紫色渐变背景 + 白色 Sparkles 符号）
- 适配 Capacitor Android 的各分辨率 mipmap
"""
from PIL import Image, ImageDraw
import os

OUT_DIR = '/home/z/my-project/prompthub-android/android-resources'
os.makedirs(OUT_DIR, exist_ok=True)

# 紫色渐变背景
def make_gradient(size, color1=(124, 58, 237), color2=(76, 29, 149)):
    """生成对角线渐变"""
    img = Image.new('RGB', (size, size), color1)
    pixels = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            r = int(color1[0] * (1-t) + color2[0] * t)
            g = int(color1[1] * (1-t) + color2[1] * t)
            b = int(color1[2] * (1-t) + color2[2] * t)
            pixels[x, y] = (r, g, b)
    return img

def draw_sparkles(img, size):
    """在中心绘制一个简化的 Sparkles 图标（四角星）"""
    draw = ImageDraw.Draw(img, 'RGBA')
    cx, cy = size // 2, size // 2
    r = int(size * 0.32)
    points = [
        (cx, cy - r),
        (cx + r * 0.35, cy - r * 0.35),
        (cx + r, cy),
        (cx + r * 0.35, cy + r * 0.35),
        (cx, cy + r),
        (cx - r * 0.35, cy + r * 0.35),
        (cx - r, cy),
        (cx - r * 0.35, cy - r * 0.35),
    ]
    draw.polygon(points, fill=(255, 255, 255, 255))
    small_r = int(r * 0.28)
    sx, sy = cx + int(r * 0.85), cy - int(r * 0.85)
    small_points = [
        (sx, sy - small_r),
        (sx + small_r * 0.35, sy - small_r * 0.35),
        (sx + small_r, sy),
        (sx + small_r * 0.35, sy + small_r * 0.35),
        (sx, sy + small_r),
        (sx - small_r * 0.35, sy + small_r * 0.35),
        (sx - small_r, sy),
        (sx - small_r * 0.35, sy - small_r * 0.35),
    ]
    draw.polygon(small_points, fill=(255, 255, 255, 255))
    tiny_r = int(r * 0.18)
    tx, ty = cx - int(r * 0.75), cy + int(r * 0.75)
    tiny_points = [
        (tx, ty - tiny_r),
        (tx + tiny_r * 0.35, ty - tiny_r * 0.35),
        (tx + tiny_r, ty),
        (tx + tiny_r * 0.35, ty + tiny_r * 0.35),
        (tx, ty + tiny_r),
        (tx - tiny_r * 0.35, ty + tiny_r * 0.35),
        (tx - tiny_r, ty),
        (tx - tiny_r * 0.35, ty - tiny_r * 0.35),
    ]
    draw.polygon(tiny_points, fill=(255, 255, 255, 255))

def main():
    # 主图标 1024x1024
    size = 1024
    img = make_gradient(size)
    draw_sparkles(img, size)
    main_path = os.path.join(OUT_DIR, 'icon.png')
    img.save(main_path, 'PNG')
    print(f'主图标已生成: {main_path}')
    
    # Android 各分辨率 mipmap
    sizes_map = {
        'mdpi': 48,
        'hdpi': 72,
        'xhdpi': 96,
        'xxhdpi': 144,
        'xxxhdpi': 192,
    }
    for density, px in sizes_map.items():
        small = make_gradient(px)
        draw_sparkles(small, px)
        p = os.path.join(OUT_DIR, f'ic_launcher_{density}.png')
        small.save(p, 'PNG')
        print(f'  {density}: {p} ({px}x{px})')
    
    # Splash 屏
    splash = Image.new('RGB', (1242, 2436), (124, 58, 237))
    # 渐变填充
    pixels = splash.load()
    for y in range(1242):
        for x in range(2436):
            pass  # 太慢，跳过 splash 渐变，用纯色
    # 用纯紫
    splash = Image.new('RGB', (1242, 2436), (124, 58, 237))
    # 居中放图标
    icon_on_splash = make_gradient(400)
    draw_sparkles(icon_on_splash, 400)
    mask = Image.new('L', (400, 400), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, 400, 400], radius=80, fill=255)
    splash.paste(icon_on_splash, ((1242-400)//2, (2436-400)//2), mask)
    splash_path = os.path.join(OUT_DIR, 'splash.png')
    splash.save(splash_path, 'PNG')
    print(f'  splash: {splash_path}')
    
    # Adaptive icon foreground
    fg_size = 432
    fg = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
    fg_draw = ImageDraw.Draw(fg, 'RGBA')
    cx, cy = fg_size // 2, fg_size // 2
    r = int(fg_size * 0.28)
    points = [
        (cx, cy - r), (cx + r * 0.35, cy - r * 0.35),
        (cx + r, cy), (cx + r * 0.35, cy + r * 0.35),
        (cx, cy + r), (cx - r * 0.35, cy + r * 0.35),
        (cx - r, cy), (cx - r * 0.35, cy - r * 0.35),
    ]
    fg_draw.polygon(points, fill=(255, 255, 255, 255))
    small_r = int(r * 0.28)
    sx, sy = cx + int(r * 0.85), cy - int(r * 0.85)
    small_points = [
        (sx, sy - small_r), (sx + small_r * 0.35, sy - small_r * 0.35),
        (sx + small_r, sy), (sx + small_r * 0.35, sy + small_r * 0.35),
        (sx, sy + small_r), (sx - small_r * 0.35, sy + small_r * 0.35),
        (sx - small_r, sy), (sx - small_r * 0.35, sy - small_r * 0.35),
    ]
    fg_draw.polygon(small_points, fill=(255, 255, 255, 255))
    fg_path = os.path.join(OUT_DIR, 'ic_launcher_foreground.png')
    fg.save(fg_path, 'PNG')
    print(f'  adaptive foreground: {fg_path}')
    
    # Adaptive icon background
    bg = make_gradient(fg_size, (124, 58, 237), (76, 29, 149))
    bg_path = os.path.join(OUT_DIR, 'ic_launcher_background.png')
    bg.save(bg_path, 'PNG')
    print(f'  adaptive background: {bg_path}')

if __name__ == '__main__':
    main()
