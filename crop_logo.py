from PIL import Image

src_path = r"C:\Users\17479\.gemini\antigravity\brain\d57bee0d-b2f1-4bf9-b299-592d0e6d9668\.user_uploaded\media_1787614396101.jpg"
img = Image.open(src_path)
width, height = img.size
print(f"Original size: {width}x{height}")

# In the original 1024x1024 (or similar) image, the central golden emblem is located in the center.
# Let's crop the central region tightly around the "iB" symbol so it fills the icon.
# Center is (width/2, height/2).
# Let's crop roughly x: 26% to 74%, y: 22% to 78% (or similar).

crop_left = int(width * 0.26)
crop_top = int(height * 0.22)
crop_right = int(width * 0.74)
crop_bottom = int(height * 0.76)

cropped = img.crop((crop_left, crop_top, crop_right, crop_bottom))
# Resize to high resolution square with smooth resampling (512x512)
cropped_square = cropped.resize((512, 512), Image.Resampling.LANCZOS)

# Save to frontend/public
cropped_square.save(r"d:\Antigravity项目\财务管理系统\frontend\public\logo.png", "PNG")
cropped_square.save(r"d:\Antigravity项目\财务管理系统\frontend\public\apple-touch-icon.png", "PNG")
cropped_square.save(r"d:\Antigravity项目\财务管理系统\frontend\public\logo.jpg", "JPEG", quality=95)

print("Successfully cropped and saved tight logo filling the entire frame!")
