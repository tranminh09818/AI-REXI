import os
from PIL import Image

# Source path
src_cat_path = r"d:\QLy Phòng Khám Thú Y\Frontend\public\img\avtpkty.png"
out_dir = r"d:\AI REXI\Frontend\public"

os.makedirs(out_dir, exist_ok=True)

# Open cat image (black silhouette on transparent/white)
img = Image.open(src_cat_path).convert("RGBA")

# Convert black cat pixels to white cat pixels with 100% transparent background
data = img.getdata()
new_data = []
for item in data:
    # If pixel is dark/black (cat silhouette)
    if item[0] < 100 and item[1] < 100 and item[2] < 100 and item[3] > 50:
        new_data.append((255, 255, 255, item[3]))
    else:
        new_data.append((0, 0, 0, 0))

img_white = Image.new("RGBA", img.size)
img_white.putdata(new_data)

# Save transparent white cat PNG
img_white.save(os.path.join(out_dir, "rexi_cat_icon.png"), "PNG")
img_white.save(os.path.join(out_dir, "favicon.png"), "PNG")

print("Transparent white cat icon created successfully!")
