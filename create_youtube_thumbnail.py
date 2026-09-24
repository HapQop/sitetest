from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

# YouTube thumbnail size
WIDTH = 1280
HEIGHT = 720

# Create new image with gradient background
img = Image.new('RGB', (WIDTH, HEIGHT))
draw = ImageDraw.Draw(img)

# Create gradient background (dark red/burgundy to black)
for y in range(HEIGHT):
    ratio = y / HEIGHT
    r = int(45 * (1 - ratio) + 20 * ratio)
    g = int(20 * (1 - ratio) + 10 * ratio)
    b = int(25 * (1 - ratio) + 15 * ratio)
    draw.rectangle([(0, y), (WIDTH, y + 1)], fill=(r, g, b))

# Load and place executor screenshot
try:
    screenshot = Image.open('C:/Users/1mmx1/AppData/Local/Temp/claude/F--site/a5f6c06c-7387-4417-b553-d1bbe2dbf07c/images/4.png')

    # Resize screenshot to fit right side
    screenshot_width = int(WIDTH * 0.55)
    aspect = screenshot.height / screenshot.width
    screenshot_height = int(screenshot_width * aspect)
    screenshot = screenshot.resize((screenshot_width, screenshot_height), Image.Resampling.LANCZOS)

    # Add subtle glow/border effect
    border_img = Image.new('RGBA', (screenshot_width + 8, screenshot_height + 8), (200, 50, 60, 0))
    border_draw = ImageDraw.Draw(border_img)
    border_draw.rectangle([(0, 0), (screenshot_width + 7, screenshot_height + 7)],
                         outline=(220, 60, 70, 255), width=4)

    # Position on right side
    x_pos = WIDTH - screenshot_width - 40
    y_pos = (HEIGHT - screenshot_height) // 2

    # Paste border then screenshot
    if border_img.mode == 'RGBA':
        img.paste(border_img, (x_pos - 4, y_pos - 4), border_img)
    img.paste(screenshot, (x_pos, y_pos))

except Exception as e:
    print(f"Screenshot load failed: {e}")

# Load logo
try:
    logo = Image.open('assets/isaeva-logo-white.png')
    logo_size = 100
    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    img.paste(logo, (50, 40), logo if logo.mode == 'RGBA' else None)
except Exception as e:
    print(f"Logo load failed: {e}")

# Try to load fonts (fallback to default if not available)
try:
    title_font = ImageFont.truetype("C:/Windows/Fonts/impact.ttf", 90)
    subtitle_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 28)
    free_font = ImageFont.truetype("C:/Windows/Fonts/impact.ttf", 130)
    trial_font = ImageFont.truetype("C:/Windows/Fonts/impact.ttf", 130)
except:
    title_font = ImageFont.load_default()
    subtitle_font = ImageFont.load_default()
    free_font = ImageFont.load_default()
    trial_font = ImageFont.load_default()

# Draw "ISAEVA" title
title_y = 50
draw.text((170, title_y), "ISAEVA", fill=(255, 255, 255), font=title_font,
         stroke_width=3, stroke_fill=(0, 0, 0))

# Draw "ROBLOX EXECUTOR" subtitle
subtitle_y = title_y + 100
draw.text((170, subtitle_y), "ROBLOX EXECUTOR", fill=(200, 200, 200), font=subtitle_font)

# Draw accent line
line_y = subtitle_y + 35
draw.rectangle([(170, line_y), (420, line_y + 3)], fill=(220, 60, 70))

# Draw "FREE TRIAL" text with emphasis
free_y = 320
trial_y = free_y + 120

# FREE text (yellow/gold gradient effect)
draw.text((52, free_y), "FREE", fill=(255, 230, 80), font=free_font,
         stroke_width=4, stroke_fill=(0, 0, 0))

# TRIAL text (white with strong outline)
draw.text((52, trial_y), "TRIAL", fill=(255, 255, 255), font=trial_font,
         stroke_width=4, stroke_fill=(0, 0, 0))

# Add red accent underline under TRIAL
underline_y = trial_y + 140
draw.rectangle([(50, underline_y), (520, underline_y + 5)], fill=(220, 60, 70))

# Add arrow pointing to FREE TRIAL
arrow_points = [
    (540, free_y + 100),  # tip
    (640, free_y + 60),   # top back
    (610, free_y + 100),  # middle back
    (640, free_y + 140)   # bottom back
]
draw.polygon(arrow_points, fill=(220, 60, 70), outline=(255, 255, 255))

# Save
output_path = 'assets/isaeva-youtube-thumbnail.png'
img.save(output_path, 'PNG', optimize=True)
print(f"Thumbnail created: {output_path}")
print(f"Size: {WIDTH}x{HEIGHT}px")
