from PIL import Image

src_path = r"C:\Users\17479\.gemini\antigravity\brain\d57bee0d-b2f1-4bf9-b299-592d0e6d9668\.user_uploaded\media_1787615496242.png"
img = Image.open(src_path).convert("RGBA")

# 1. Tightly crop the alpha bounding box
bbox = img.getbbox()
print(f"Original Transparent BBox: {bbox}")
cropped_emblem = img.crop(bbox)

ew, eh = cropped_emblem.size
print(f"Emblem dimensions: {ew}x{eh}")

# 2. Function to composite emblem on luxury dark background with custom scale
def create_app_icon(size=512, emblem_scale=0.82, bg_color=(11, 15, 25)):
  canvas = Image.new("RGBA", (size, size), bg_color + (255,))
  
  max_dim = int(size * emblem_scale)
  if ew > eh:
    target_w = max_dim
    target_h = int(eh * (max_dim / ew))
  else:
    target_h = max_dim
    target_w = int(ew * (max_dim / eh))
    
  resized_emblem = cropped_emblem.resize((target_w, target_h), Image.Resampling.LANCZOS)
  
  offset_x = (size - target_w) // 2
  offset_y = (size - target_h) // 2
  
  canvas.paste(resized_emblem, (offset_x, offset_y), resized_emblem)
  return canvas

icon_512 = create_app_icon(512, emblem_scale=0.82)
icon_192 = create_app_icon(192, emblem_scale=0.82)
icon_180 = create_app_icon(180, emblem_scale=0.82)

# Save icons to public
icon_512.save(r"d:\Antigravity项目\财务管理系统\frontend\public\apple-touch-icon.png", "PNG")
icon_512.save(r"d:\Antigravity项目\财务管理系统\frontend\public\apple-touch-icon-precomposed.png", "PNG")
icon_180.save(r"d:\Antigravity项目\财务管理系统\frontend\public\apple-touch-icon-180x180.png", "PNG")
icon_192.save(r"d:\Antigravity项目\财务管理系统\frontend\public\pwa-192x192.png", "PNG")
icon_512.save(r"d:\Antigravity项目\财务管理系统\frontend\public\pwa-512x512.png", "PNG")

# Transparent logo and JPEG
cropped_emblem.save(r"d:\Antigravity项目\财务管理系统\frontend\public\logo-transparent.png", "PNG")
icon_512.save(r"d:\Antigravity项目\财务管理系统\frontend\public\logo.png", "PNG")
icon_512.convert("RGB").save(r"d:\Antigravity项目\财务管理系统\frontend\public\logo.jpg", "JPEG", quality=98)

print("Generated all luxury dark app icons and transparent logos successfully!")
