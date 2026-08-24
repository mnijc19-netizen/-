from PIL import Image
import numpy as np

src_path = r"C:\Users\17479\.gemini\antigravity\brain\d57bee0d-b2f1-4bf9-b299-592d0e6d9668\.user_uploaded\media_1787614396101.jpg"
img = Image.open(src_path).convert("RGB")
arr = np.array(img)

# Find pixels that are golden/bright (brightness > 60)
# Dark background is around rgb(25, 25, 28)
bright_mask = (arr[:, :, 0] > 70) | (arr[:, :, 1] > 65) | (arr[:, :, 2] > 55)
coords = np.argwhere(bright_mask)

y_min, x_min = coords.min(axis=0)
y_max, x_max = coords.max(axis=0)

print(f"Emblem Bounding Box: X [{x_min}, {x_max}], Y [{y_min}, {y_max}]")
emblem_w = x_max - x_min
emblem_h = y_max - y_min
print(f"Emblem Size: {emblem_w}x{emblem_h}")

# The emblem center
cx = (x_min + x_max) // 2
cy = (y_min + y_max) // 2

# We want the emblem to occupy ~68% of the final iOS icon square,
# so the square size should be emblem_h / 0.68
square_size = int(max(emblem_w, emblem_h) / 0.68)

crop_x1 = cx - square_size // 2
crop_y1 = cy - square_size // 2
crop_x2 = crop_x1 + square_size
crop_y2 = crop_y1 + square_size

print(f"Optimal Full-Bleed Crop Box: ({crop_x1}, {crop_y1}, {crop_x2}, {crop_y2})")

cropped = img.crop((crop_x1, crop_y1, crop_x2, crop_y2))
icon_512 = cropped.resize((512, 512), Image.Resampling.LANCZOS)
icon_192 = cropped.resize((192, 192), Image.Resampling.LANCZOS)

icon_512.save(r"d:\Antigravity项目\财务管理系统\frontend\public\apple-touch-icon.png", "PNG")
icon_512.save(r"d:\Antigravity项目\财务管理系统\frontend\public\apple-touch-icon-precomposed.png", "PNG")
icon_512.save(r"d:\Antigravity项目\财务管理系统\frontend\public\logo.png", "PNG")
icon_512.save(r"d:\Antigravity项目\财务管理系统\frontend\public\logo.jpg", "JPEG", quality=98)
icon_192.save(r"d:\Antigravity项目\财务管理系统\frontend\public\pwa-192x192.png", "PNG")
icon_512.save(r"d:\Antigravity项目\财务管理系统\frontend\public\pwa-512x512.png", "PNG")

print("Generated mathematically optimal full-bleed iOS icon matching Notion/Kimi proportions!")
