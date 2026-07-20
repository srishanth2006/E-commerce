"""Generate a manual/local supplier bill sample - no GST, handwritten style."""
from PIL import Image, ImageDraw, ImageFont
import os

WIDTH, HEIGHT = 700, 900
img = Image.new("RGB", (WIDTH, HEIGHT), "#FFFDE7")  # light yellow like bill paper
draw = ImageDraw.Draw(img)

try:
    title_font = ImageFont.truetype("arial.ttf", 20)
    body_font = ImageFont.truetype("arial.ttf", 14)
    bold_font = ImageFont.truetype("arialbd.ttf", 15)
    small_font = ImageFont.truetype("arial.ttf", 12)
except OSError:
    title_font = body_font = bold_font = small_font = ImageFont.load_default()

y = 25

# Store Header
draw.text((200, y), "VENKATESHWARA TRADERS", fill="black", font=title_font)
y += 28
draw.text((180, y), "Daily Needs & Grocery Wholesale", fill="#555555", font=small_font)
y += 18
draw.text((150, y), "Near Bus Stand, Tumkur - 572101", fill="#555555", font=small_font)
y += 16
draw.text((200, y), "Ph: 9876543210", fill="#555555", font=small_font)
y += 25

draw.line([(20, y), (680, y)], fill="black", width=2)
y += 15

# Invoice details - NO GST
draw.text((30, y), "Bill No: 0847", fill="black", font=bold_font)
draw.text((400, y), "Date: 17/07/2026", fill="black", font=bold_font)
y += 22
draw.text((30, y), "Customer: E-commerce", fill="black", font=body_font)
y += 30

# Line separator
draw.line([(20, y), (680, y)], fill="black", width=1)
y += 10

# Table header
draw.text((30, y), "Item", fill="black", font=bold_font)
draw.text((350, y), "Qty", fill="black", font=bold_font)
draw.text((430, y), "Rate", fill="black", font=bold_font)
draw.text((540, y), "Amount", fill="black", font=bold_font)
y += 22
draw.line([(20, y), (680, y)], fill="black", width=1)
y += 8

# Items - typical local supplier bill (no HSN, no GST %)
items = [
    ("Rice (Sona Masoori 25kg)",   "2",   "1350",   "2700"),
    ("Toor Dal (5kg)",             "3",    "420",   "1260"),
    ("Sugar (5kg)",                "4",    "210",    "840"),
    ("Sunflower Oil (5L)",         "2",    "610",   "1220"),
    ("Maida (1kg)",               "10",     "45",    "450"),
    ("Besan (1kg)",                "5",     "80",    "400"),
    ("Red Chilli Powder (500g)",  "10",     "65",    "650"),
    ("Turmeric Powder (500g)",     "5",     "55",    "275"),
    ("Sambar Powder (200g)",      "10",     "40",    "400"),
    ("Bajji Bonda Mix (500g)",     "8",     "35",    "280"),
    ("Groundnut Oil (1L)",         "6",    "180",   "1080"),
    ("Mustard Oil (1L)",           "3",    "160",    "480"),
    ("Onion (5kg)",                "5",     "30",    "150"),
    ("Potato (5kg)",               "4",     "35",    "140"),
    ("Tomato (2kg)",               "5",     "40",    "200"),
    ("Coconut (1kg)",              "6",     "50",    "300"),
    ("Green Chillies (250g)",     "10",     "15",    "150"),
    ("Ginger (250g)",              "5",     "40",    "200"),
    ("Garlic (250g)",              "5",     "35",    "175"),
    ("Soap (Rin 200g)",           "20",     "22",    "440"),
]

for name, qty, rate, amt in items:
    draw.text((30, y),  name, fill="black", font=body_font)
    draw.text((365, y), qty,  fill="black", font=body_font)
    draw.text((435, y), rate, fill="black", font=body_font)
    draw.text((545, y), amt,  fill="black", font=body_font)
    y += 20

y += 5
draw.line([(20, y), (680, y)], fill="black", width=1)
y += 12

# Total - simple, no GST breakup
draw.text((350, y), "Total:", fill="black", font=bold_font)
draw.text((530, y), "11,590", fill="black", font=bold_font)
y += 25

draw.line([(20, y), (680, y)], fill="black", width=2)
y += 15

# Footer
draw.text((30, y), "Paid: Cash", fill="black", font=body_font)
y += 20
draw.text((30, y), "Thank you! Visit again.", fill="#555555", font=small_font)
y += 20
draw.text((30, y), "No GST - Composition Dealer", fill="#888888", font=small_font)

output_path = os.path.join(os.path.dirname(__file__), "sample_manual_bill.png")
img.save(output_path, "PNG")
print(f"Saved: {output_path}")
