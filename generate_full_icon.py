from PIL import Image

src_path = r"C:\Users\17479\.gemini\antigravity\brain\d57bee0d-b2f1-4bf9-b299-592d0e6d9668\.user_uploaded\media_1787614396101.jpg"
img = Image.open(src_path)
width, height = img.size

# Let's inspect the inner squircle bounds.
# In the 1024x1024 image:
# The outer canvas is dark background: (0, 0) to (1024, 1024)
# The inner 3D squircle button is around x: 185 to 839, y: 165 to 830.
# The golden emblem itself is around x: 380 to 650, y: 300 to 670.

# For an iOS App Icon (apple-touch-icon), iOS automatically masks the corners of the 512x512 square.
# If we crop the inner squircle surface tightly (e.g. x: 215 to 809, y: 195 to 800),
# the dark metallic surface becomes the FULL background, and the golden emblem sits prominently
# filling ~65-70% of the entire icon (just like Notion / Kimi / Apple apps)!

# Let's crop from the inner dark surface:
crop_box = (
    int(width * 0.22),
    int(height * 0.20),
    int(width * 0.78),
    int(height * 0.80)
)

cropped = img.crop(crop_box)
# Let's resize with high quality Lanczos filter to standard iOS app icon sizes
icon_512 = cropped.resize((512, 512), Image.Resampling.LANCZOS)
icon_192 = cropped.resize((192, 192), Image.Resampling.LANCZOS)

# Save to public assets
icon_512.save(r"d:\Antigravity项目\财务管理系统\frontend\public\apple-touch-icon.png", "PNG")
icon_512.save(r"d:\Antigravity项目\财务管理系统\frontend\public\apple-touch-icon-precomposed.png", "PNG")
icon_512.save(r"d:\Antigravity项目\财务管理系统\frontend\public\logo.png", "PNG")
icon_512.save(r"d:\Antigravity项目\财务管理系统\frontend\public\logo.jpg", "JPEG", quality=98)
icon_192.save(r"d:\Antigravity项目\财务管理系统\frontend\public\pwa-192x192.png", "PNG")
icon_512.save(r"d:\Antigravity项目\财务管理系统\frontend\public\pwa-512x512.png", "PNG")

print("Generated full-bleed iOS app icons successfully!")
