import pytesseract
from PIL import Image

# Path to images
img1_path = r"C:\Users\17479\.gemini\antigravity\brain\d57bee0d-b2f1-4bf9-b299-592d0e6d9668\.user_uploaded\media_1787644770346.png"
img2_path = r"C:\Users\17479\.gemini\antigravity\brain\d57bee0d-b2f1-4bf9-b299-592d0e6d9668\.user_uploaded\media_1787644770350.png"
img3_path = r"C:\Users\17479\.gemini\antigravity\brain\d57bee0d-b2f1-4bf9-b299-592d0e6d9668\.user_uploaded\media_1787644771998.png"

for idx, p in enumerate([img1_path, img2_path, img3_path], 1):
    print(f"================ IMAGE {idx} ================")
    try:
        txt = pytesseract.image_to_string(Image.open(p), lang='chi_sim+eng')
        print(txt)
    except Exception as e:
        print("Tesseract error:", e)
