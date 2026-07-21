"""
routers/seed.py
---------------
POST /seed/seed-data  - populate categories, brands, suppliers, products
POST /seed/seed-admin - create initial admin (no auth required, one-time only)
"""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas, auth
from app.database import get_db

router = APIRouter(prefix="/seed", tags=["Seed Data"])

CATEGORIES = [
    ("Rice & Grains", "Rice, wheat, millets, poha, oats"),
    ("Pulses & Dal", "All dals, rajma, chana, lobia"),
    ("Atta, Maida & Flours", "Wheat flour, maida, besan, rice flour"),
    ("Cooking Oils & Ghee", "Refined oil, mustard oil, coconut oil, ghee"),
    ("Spices & Masala", "Whole spices, powder spices, pastes"),
    ("Sugar, Salt & Jaggery", "Sugar, salt, jaggery, sweeteners"),
    ("Tea, Coffee & Beverages", "Tea, coffee, health drinks, squash"),
    ("Soft Drinks & Juices", "Coke, Pepsi, Frooti, Real juice"),
    ("Dairy Products", "Milk, curd, butter, cheese, paneer, cream"),
    ("Bread & Bakery", "Bread, buns, rusk, cake"),
    ("Noodles, Pasta & Vermicelli", "Maggi, Yippee, pasta, vermicelli"),
    ("Snacks & Namkeen", "Chips, bhujia, mixture, popcorn"),
    ("Biscuits & Cookies", "All biscuit brands"),
    ("Sweets & Chocolates", "Chocolate, toffee, mithai"),
    ("Dry Fruits & Nuts", "Cashew, almond, raisin, peanut"),
    ("Pickles & Chutneys", "Achar, chutney, papad"),
    ("Sauces & Ketchup", "Tomato sauce, soy sauce, vinegar"),
    ("Canned & Packaged Food", "Baked beans, soup, ready-to-eat"),
    ("Household Cleaning", "Detergent, dishwash, floor cleaner"),
    ("Bathroom & Toilet", "Toilet cleaner, bathroom cleaner"),
    ("Personal Care", "Soap, shampoo, toothpaste, oil"),
    ("Baby Care", "Diapers, baby soap, baby powder"),
    ("Pet Food", "Dog food, cat food"),
    ("Kitchen Accessories", "Trash bags, aluminium foil, cling wrap"),
    ("Stationary & Misc", "Batteries, candles, matches"),
]

BRANDS = [
    "India Gate", "Fortune", "Saffola", "Amul", "Britannia", "Parle",
    "Haldiram's", "Maggi", "Tata", "Nescafe", "Surf Excel", "Dettol",
    "Colgate", "Patanjali", "Aashirvaad", "Daawat", "Kohinoor", "MDH",
    "Everest", "Brooke Bond", "Lipton", "Pepsico", "Coca-Cola",
    "ITC", "Nestle", "Prestige", "Eastern", "Mantra", "24 Mantra",
    "Dabur", "Bajaj", "Himalaya", "Vatika", "Sunsilk", "Head & Shoulders",
    "Lifebuoy", "Lux", "Rin", "Wheel", "Vim", "Harpic", "Lizol",
    "Comfort", "Odonil", "Good Knight", "Hit", "Baygon", "Pears",
    "Nivea", "Pantene", "Clinic Plus", "Sensodyne", "Close Up",
    "Lay's", "Kurkure", "Bingo", "Too Yumm", "Cornitos", "Pringles",
    "Oreo", "Good Day", "Marie Gold", "Dark Fantasy", "Sunfeast",
    "Cadbury", "Dairy Milk", "KitKat", "Munch", "Eclairs",
    "Tropicana", "Paper Boat", "Sting", "Real", "Frooti",
    "Quaker", "Saffola Oats", "MTR", "Chings", "Knorr", "Yippee",
    "50-50", "Monaco", "Krackjack", "Little Hearts", "Marie Light",
    "Rajdhani", "Tata Sampann", "Mother's Recipe", "Kissan",
    "Mysore Pak", "Anand", "Amul Ice Cream", "Kwality Wall's",
    "Pedigree", "Whiskas", "Drools",
]

SUPPLIERS = [
    {"supplier_name": "Rajesh Trading Co.", "contact_person": "Rajesh Kumar", "phone": "9876543210", "email": "rajesh@tradingco.com", "address": "123 Market Road, Chennai", "gst_number": "29ABCDE1234F1Z5"},
    {"supplier_name": "Metro Wholesale Distributors", "contact_person": "Suresh Patel", "phone": "9876543211", "email": "suresh@metrowholesale.com", "address": "45 Wholesale Market, Mumbai", "gst_number": "27FGHIJ5678K1Z6"},
    {"supplier_name": "Green Valley Foods", "contact_person": "Priya Sharma", "phone": "9876543212", "email": "priya@greenvalleyfoods.com", "address": "78 Agricultural Market, Delhi", "gst_number": "07KLMNO9012P1Z7"},
    {"supplier_name": "Southern Supermarkets Pvt Ltd", "contact_person": "Vijay Reddy", "phone": "9876543213", "email": "vijay@southernsuper.com", "address": "12 Industrial Area, Hyderabad", "gst_number": "36QRSTU3456V1Z8"},
    {"supplier_name": "National FMCG Distributors", "contact_person": "Amit Singh", "phone": "9876543214", "email": "amit@nfmcgdistributors.com", "address": "90 Ring Road, Bangalore", "gst_number": "29UVWXY7890Z1Z9"},
    {"supplier_name": "Pacific Food Traders", "contact_person": "Neha Gupta", "phone": "9876543215", "email": "neha@pacifictraders.com", "address": "34 GT Road, Kolkata", "gst_number": "19ABCDEF1234G1Z0"},
    {"supplier_name": "Sri Balaji Wholesale", "contact_person": "Krishna Murthy", "phone": "9876543216", "email": "krishna@balaji.com", "address": "56 T Nagar, Chennai", "gst_number": "33GHIJKL5678H1Z1"},
    {"supplier_name": "Bharat Grocery Supplies", "contact_person": "Ravi Verma", "phone": "9876543217", "email": "ravi@bharatgrocery.com", "address": "78 Civil Lines, Jaipur", "gst_number": "08MNOPQ9012I1Z2"},
]

PRODUCTS = [
    {"n": "Basmati Rice 1kg", "c": "Rice & Grains", "b": "India Gate", "pp": 120, "sp": 149, "mrp": 155, "sq": 150, "rl": 20, "u": "kg", "gst": 0, "bc": "8901042011017"},
    {"n": "Sona Masoori Rice 5kg", "c": "Rice & Grains", "b": "Daawat", "pp": 280, "sp": 335, "mrp": 349, "sq": 80, "rl": 15, "u": "kg", "gst": 0, "bc": "8901042011024"},
    {"n": "Raw Rice 1kg", "c": "Rice & Grains", "b": "Kohinoor", "pp": 45, "sp": 56, "mrp": 60, "sq": 200, "rl": 30, "u": "kg", "gst": 0, "bc": "8901042011031"},
    {"n": "Brown Rice 1kg", "c": "Rice & Grains", "b": "24 Mantra", "pp": 85, "sp": 110, "mrp": 115, "sq": 40, "rl": 10, "u": "kg", "gst": 0, "bc": "8901042011048"},
    {"n": "Poha (Flattened Rice) 500g", "c": "Rice & Grains", "b": "Patanjali", "pp": 28, "sp": 36, "mrp": 40, "sq": 120, "rl": 20, "u": "kg", "gst": 0, "bc": "8901042011055"},
    {"n": "Quaker Oats 1kg", "c": "Rice & Grains", "b": "Quaker", "pp": 145, "sp": 180, "mrp": 190, "sq": 50, "rl": 10, "u": "kg", "gst": 5, "bc": "8901042011062"},
    {"n": "Barnyard Millet 500g", "c": "Rice & Grains", "b": "24 Mantra", "pp": 60, "sp": 80, "mrp": 85, "sq": 30, "rl": 10, "u": "kg", "gst": 0, "bc": "8901042011079"},
    {"n": "Ragi Flour 500g", "c": "Rice & Grains", "b": "Eastern", "pp": 35, "sp": 48, "mrp": 50, "sq": 35, "rl": 10, "u": "kg", "gst": 0, "bc": "8901042011086"},
    {"n": "Toor Dal 1kg", "c": "Pulses & Dal", "b": "Aashirvaad", "pp": 140, "sp": 175, "mrp": 180, "sq": 90, "rl": 15, "u": "kg", "gst": 0, "bc": "8901063001012"},
    {"n": "Moong Dal 1kg", "c": "Pulses & Dal", "b": "Aashirvaad", "pp": 120, "sp": 155, "mrp": 160, "sq": 70, "rl": 15, "u": "kg", "gst": 0, "bc": "8901063001029"},
    {"n": "Chana Dal 1kg", "c": "Pulses & Dal", "b": "Patanjali", "pp": 80, "sp": 105, "mrp": 110, "sq": 60, "rl": 10, "u": "kg", "gst": 0, "bc": "8901063001036"},
    {"n": "Masoor Dal 1kg", "c": "Pulses & Dal", "b": "Aashirvaad", "pp": 100, "sp": 130, "mrp": 135, "sq": 50, "rl": 10, "u": "kg", "gst": 0, "bc": "8901063001043"},
    {"n": "Rajma 500g", "c": "Pulses & Dal", "b": "Tata Sampann", "pp": 55, "sp": 72, "mrp": 75, "sq": 45, "rl": 10, "u": "kg", "gst": 0, "bc": "8901063001050"},
    {"n": "Black Chana 500g", "c": "Pulses & Dal", "b": "Tata Sampann", "pp": 45, "sp": 60, "mrp": 64, "sq": 40, "rl": 10, "u": "kg", "gst": 0, "bc": "8901063001067"},
    {"n": "Urad Dal 1kg", "c": "Pulses & Dal", "b": "Aashirvaad", "pp": 130, "sp": 165, "mrp": 170, "sq": 35, "rl": 10, "u": "kg", "gst": 0, "bc": "8901063001074"},
    {"n": "Lobia (Black Eyed Peas) 500g", "c": "Pulses & Dal", "b": "Mantra", "pp": 40, "sp": 55, "mrp": 58, "sq": 30, "rl": 10, "u": "kg", "gst": 0, "bc": "8901063001081"},
    {"n": "Aashirvaad Atta 5kg", "c": "Atta, Maida & Flours", "b": "Aashirvaad", "pp": 240, "sp": 295, "mrp": 310, "sq": 60, "rl": 10, "u": "kg", "gst": 0, "bc": "8901063008011"},
    {"n": "Patanjali Atta 5kg", "c": "Atta, Maida & Flours", "b": "Patanjali", "pp": 210, "sp": 265, "mrp": 280, "sq": 40, "rl": 10, "u": "kg", "gst": 0, "bc": "8901063008028"},
    {"n": "Maida 1kg", "c": "Atta, Maida & Flours", "b": "Aashirvaad", "pp": 30, "sp": 40, "mrp": 42, "sq": 80, "rl": 15, "u": "kg", "gst": 0, "bc": "8901063008035"},
    {"n": "Besan 500g", "c": "Atta, Maida & Flours", "b": "Aashirvaad", "pp": 42, "sp": 55, "mrp": 58, "sq": 70, "rl": 15, "u": "pcs", "gst": 0, "bc": "8901063008042"},
    {"n": "Rice Flour 500g", "c": "Atta, Maida & Flours", "b": "Eastern", "pp": 32, "sp": 44, "mrp": 48, "sq": 35, "rl": 10, "u": "pcs", "gst": 0, "bc": "8901063008059"},
    {"n": "Suji (Semolina) 500g", "c": "Atta, Maida & Flours", "b": "Eastern", "pp": 28, "sp": 38, "mrp": 40, "sq": 45, "rl": 10, "u": "pcs", "gst": 0, "bc": "8901063008066"},
    {"n": "Sooji Rava 1kg", "c": "Atta, Maida & Flours", "b": "Aashirvaad", "pp": 48, "sp": 62, "mrp": 66, "sq": 30, "rl": 10, "u": "kg", "gst": 0, "bc": "8901063008073"},
    {"n": "Sunflower Oil 1L", "c": "Cooking Oils & Ghee", "b": "Fortune", "pp": 130, "sp": 155, "mrp": 160, "sq": 120, "rl": 20, "u": "litre", "gst": 5, "bc": "8901058001018"},
    {"n": "Mustard Oil 1L", "c": "Cooking Oils & Ghee", "b": "Fortune", "pp": 155, "sp": 185, "mrp": 190, "sq": 60, "rl": 10, "u": "litre", "gst": 5, "bc": "8901058001025"},
    {"n": "Groundnut Oil 1L", "c": "Cooking Oils & Ghee", "b": "Saffola", "pp": 180, "sp": 215, "mrp": 220, "sq": 45, "rl": 10, "u": "litre", "gst": 5, "bc": "8901058001032"},
    {"n": "Coconut Oil 500ml", "c": "Cooking Oils & Ghee", "b": "Fortune", "pp": 110, "sp": 140, "mrp": 145, "sq": 30, "rl": 10, "u": "litre", "gst": 5, "bc": "8901058001049"},
    {"n": "Olive Oil 500ml", "c": "Cooking Oils & Ghee", "b": "Saffola", "pp": 280, "sp": 350, "mrp": 370, "sq": 20, "rl": 5, "u": "litre", "gst": 5, "bc": "8901058001056"},
    {"n": "Amul Ghee 1L", "c": "Cooking Oils & Ghee", "b": "Amul", "pp": 420, "sp": 520, "mrp": 540, "sq": 25, "rl": 5, "u": "litre", "gst": 5, "bc": "8901058001063"},
    {"n": "Dalda Vanaspati 1kg", "c": "Cooking Oils & Ghee", "b": "Patanjali", "pp": 95, "sp": 120, "mrp": 125, "sq": 30, "rl": 10, "u": "kg", "gst": 5, "bc": "8901058001070"},
    {"n": "Saffola Gold Oil 1L", "c": "Cooking Oils & Ghee", "b": "Saffola", "pp": 195, "sp": 240, "mrp": 250, "sq": 35, "rl": 8, "u": "litre", "gst": 5, "bc": "8901058001087"},
    {"n": "MDH Chana Masala 100g", "c": "Spices & Masala", "b": "MDH", "pp": 52, "sp": 68, "mrp": 72, "sq": 60, "rl": 10, "u": "pcs", "gst": 5, "bc": "8901063007010"},
    {"n": "Everest Turmeric 100g", "c": "Spices & Masala", "b": "Everest", "pp": 40, "sp": 54, "mrp": 58, "sq": 55, "rl": 10, "u": "pcs", "gst": 5, "bc": "8901063007027"},
    {"n": "Everest Garam Masala 50g", "c": "Spices & Masala", "b": "Everest", "pp": 38, "sp": 50, "mrp": 54, "sq": 45, "rl": 10, "u": "pcs", "gst": 5, "bc": "8901063007034"},
    {"n": "MDH Kitchen King 100g", "c": "Spices & Masala", "b": "MDH", "pp": 55, "sp": 72, "mrp": 76, "sq": 40, "rl": 10, "u": "pcs", "gst": 5, "bc": "8901063007041"},
    {"n": "Everest Chicken Masala 100g", "c": "Spices & Masala", "b": "Everest", "pp": 48, "sp": 64, "mrp": 68, "sq": 35, "rl": 10, "u": "pcs", "gst": 5, "bc": "8901063007058"},
    {"n": "Red Chilli Powder 200g", "c": "Spices & Masala", "b": "Everest", "pp": 45, "sp": 60, "mrp": 64, "sq": 50, "rl": 10, "u": "pcs", "gst": 5, "bc": "8901063007065"},
    {"n": "Coriander Powder 200g", "c": "Spices & Masala", "b": "MDH", "pp": 38, "sp": 52, "mrp": 55, "sq": 45, "rl": 10, "u": "pcs", "gst": 5, "bc": "8901063007072"},
    {"n": "Cumin Seeds 100g", "c": "Spices & Masala", "b": "MDH", "pp": 55, "sp": 72, "mrp": 76, "sq": 30, "rl": 8, "u": "pcs", "gst": 5, "bc": "8901063007089"},
    {"n": "Tata Sampann Sambar Masala 100g", "c": "Spices & Masala", "b": "Tata", "pp": 42, "sp": 56, "mrp": 60, "sq": 35, "rl": 10, "u": "pcs", "gst": 5, "bc": "8901063007096"},
    {"n": "Black Pepper Powder 50g", "c": "Spices & Masala", "b": "Everest", "pp": 65, "sp": 85, "mrp": 90, "sq": 25, "rl": 8, "u": "pcs", "gst": 5, "bc": "8901063007102"},
    {"n": "Sugar 1kg", "c": "Sugar, Salt & Jaggery", "b": "Patanjali", "pp": 40, "sp": 50, "mrp": 52, "sq": 200, "rl": 30, "u": "kg", "gst": 0, "bc": "8901063009011"},
    {"n": "Tata Salt 1kg", "c": "Sugar, Salt & Jaggery", "b": "Tata", "pp": 18, "sp": 24, "mrp": 25, "sq": 300, "rl": 50, "u": "kg", "gst": 0, "bc": "8901063009028"},
    {"n": "Jaggery Powder 500g", "c": "Sugar, Salt & Jaggery", "b": "Patanjali", "pp": 35, "sp": 48, "mrp": 52, "sq": 40, "rl": 10, "u": "kg", "gst": 0, "bc": "8901063009035"},
    {"n": "Iodised Salt 1kg", "c": "Sugar, Salt & Jaggery", "b": "Tata", "pp": 20, "sp": 28, "mrp": 30, "sq": 250, "rl": 40, "u": "kg", "gst": 0, "bc": "8901063009042"},
    {"n": "Rock Salt 500g", "c": "Sugar, Salt & Jaggery", "b": "Patanjali", "pp": 25, "sp": 35, "mrp": 38, "sq": 30, "rl": 10, "u": "kg", "gst": 0, "bc": "8901063009059"},
    {"n": "Tata Tea Gold 250g", "c": "Tea, Coffee & Beverages", "b": "Tata", "pp": 95, "sp": 120, "mrp": 125, "sq": 80, "rl": 15, "u": "pcs", "gst": 5, "bc": "8901063004013"},
    {"n": "Brooke Bond Red Label 250g", "c": "Tea, Coffee & Beverages", "b": "Brooke Bond", "pp": 70, "sp": 90, "mrp": 95, "sq": 70, "rl": 15, "u": "pcs", "gst": 5, "bc": "8901063004020"},
    {"n": "Nescafe Classic 50g", "c": "Tea, Coffee & Beverages", "b": "Nescafe", "pp": 105, "sp": 135, "mrp": 140, "sq": 60, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901058004019"},
    {"n": "Nescafe Classic 200g", "c": "Tea, Coffee & Beverages", "b": "Nescafe", "pp": 340, "sp": 425, "mrp": 450, "sq": 25, "rl": 5, "u": "pcs", "gst": 18, "bc": "8901058004026"},
    {"n": "Tata Tea Premium 250g", "c": "Tea, Coffee & Beverages", "b": "Tata", "pp": 75, "sp": 98, "mrp": 102, "sq": 65, "rl": 12, "u": "pcs", "gst": 5, "bc": "8901063004037"},
    {"n": "Bournvita 500g", "c": "Tea, Coffee & Beverages", "b": "Cadbury", "pp": 195, "sp": 250, "mrp": 260, "sq": 30, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901058004033"},
    {"n": "Complan 500g", "c": "Tea, Coffee & Beverages", "b": "Cadbury", "pp": 210, "sp": 270, "mrp": 280, "sq": 20, "rl": 5, "u": "pcs", "gst": 18, "bc": "8901058004040"},
    {"n": "Horlicks 500g", "c": "Tea, Coffee & Beverages", "b": "Nestle", "pp": 180, "sp": 230, "mrp": 240, "sq": 25, "rl": 5, "u": "pcs", "gst": 18, "bc": "8901058004057"},
    {"n": "Coca-Cola 750ml", "c": "Soft Drinks & Juices", "b": "Coca-Cola", "pp": 30, "sp": 40, "mrp": 40, "sq": 100, "rl": 20, "u": "pcs", "gst": 18, "bc": "8901063005014"},
    {"n": "Pepsi 750ml", "c": "Soft Drinks & Juices", "b": "Pepsico", "pp": 30, "sp": 40, "mrp": 40, "sq": 100, "rl": 20, "u": "pcs", "gst": 18, "bc": "8901063005021"},
    {"n": "Sprite 750ml", "c": "Soft Drinks & Juices", "b": "Coca-Cola", "pp": 30, "sp": 40, "mrp": 40, "sq": 80, "rl": 15, "u": "pcs", "gst": 18, "bc": "8901063005038"},
    {"n": "Frooti Mango 750ml", "c": "Soft Drinks & Juices", "b": "Parle", "pp": 28, "sp": 38, "mrp": 40, "sq": 60, "rl": 15, "u": "pcs", "gst": 18, "bc": "8901063005045"},
    {"n": "Real Mango Juice 1L", "c": "Soft Drinks & Juices", "b": "Dabur", "pp": 65, "sp": 85, "mrp": 90, "sq": 40, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901063005052"},
    {"n": "Paper Boat Aam Panna 200ml", "c": "Soft Drinks & Juices", "b": "Paper Boat", "pp": 18, "sp": 25, "mrp": 25, "sq": 50, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901063005069"},
    {"n": "Sting Energy Drink 250ml", "c": "Soft Drinks & Juices", "b": "Pepsico", "pp": 16, "sp": 22, "mrp": 22, "sq": 80, "rl": 15, "u": "pcs", "gst": 18, "bc": "8901063005076"},
    {"n": "Thums Up 750ml", "c": "Soft Drinks & Juices", "b": "Coca-Cola", "pp": 30, "sp": 40, "mrp": 40, "sq": 80, "rl": 15, "u": "pcs", "gst": 18, "bc": "8901063005083"},
    {"n": "Real Mixed Fruit 1L", "c": "Soft Drinks & Juices", "b": "Dabur", "pp": 60, "sp": 80, "mrp": 85, "sq": 35, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901063005090"},
    {"n": "Maaza Mango 750ml", "c": "Soft Drinks & Juices", "b": "Coca-Cola", "pp": 35, "sp": 48, "mrp": 50, "sq": 50, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901063005106"},
    {"n": "Amul Butter 100g", "c": "Dairy Products", "b": "Amul", "pp": 42, "sp": 52, "mrp": 56, "sq": 100, "rl": 20, "u": "pcs", "gst": 12, "bc": "8901058002015"},
    {"n": "Amul Cheese 200g", "c": "Dairy Products", "b": "Amul", "pp": 75, "sp": 95, "mrp": 100, "sq": 40, "rl": 10, "u": "pcs", "gst": 12, "bc": "8901058002022"},
    {"n": "Paneer 200g", "c": "Dairy Products", "b": "Amul", "pp": 65, "sp": 82, "mrp": 85, "sq": 30, "rl": 10, "u": "pcs", "gst": 12, "bc": "8901058002039"},
    {"n": "Amul Fresh Cream 200ml", "c": "Dairy Products", "b": "Amul", "pp": 55, "sp": 72, "mrp": 75, "sq": 25, "rl": 8, "u": "pcs", "gst": 12, "bc": "8901058002046"},
    {"n": "Amul Lassi Mango 200ml", "c": "Dairy Products", "b": "Amul", "pp": 18, "sp": 25, "mrp": 25, "sq": 40, "rl": 10, "u": "pcs", "gst": 12, "bc": "8901058002053"},
    {"n": "Mother Dairy Curd 400g", "c": "Dairy Products", "b": "Amul", "pp": 28, "sp": 38, "mrp": 40, "sq": 50, "rl": 12, "u": "pcs", "gst": 5, "bc": "8901058002060"},
    {"n": "Amul Taaza Milk 500ml", "c": "Dairy Products", "b": "Amul", "pp": 25, "sp": 32, "mrp": 35, "sq": 60, "rl": 15, "u": "pcs", "gst": 5, "bc": "8901058002077"},
    {"n": "Amul Ghee 500ml", "c": "Dairy Products", "b": "Amul", "pp": 240, "sp": 295, "mrp": 310, "sq": 20, "rl": 5, "u": "litre", "gst": 5, "bc": "8901058002084"},
    {"n": "Britannia White Bread 400g", "c": "Bread & Bakery", "b": "Britannia", "pp": 28, "sp": 38, "mrp": 40, "sq": 80, "rl": 20, "u": "pcs", "gst": 5, "bc": "8901063006011"},
    {"n": "Britannia Brown Bread 400g", "c": "Bread & Bakery", "b": "Britannia", "pp": 32, "sp": 44, "mrp": 46, "sq": 50, "rl": 12, "u": "pcs", "gst": 5, "bc": "8901063006028"},
    {"n": "Pav Buns 6pcs", "c": "Bread & Bakery", "b": "Britannia", "pp": 18, "sp": 25, "mrp": 25, "sq": 40, "rl": 10, "u": "pcs", "gst": 5, "bc": "8901063006035"},
    {"n": "Britannia Rusk 200g", "c": "Bread & Bakery", "b": "Britannia", "pp": 22, "sp": 30, "mrp": 32, "sq": 60, "rl": 15, "u": "pcs", "gst": 5, "bc": "8901063006042"},
    {"n": "Britannia Fruit Cake 250g", "c": "Bread & Bakery", "b": "Britannia", "pp": 45, "sp": 60, "mrp": 65, "sq": 25, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901063006059"},
    {"n": "Atta Bread 400g", "c": "Bread & Bakery", "b": "Britannia", "pp": 30, "sp": 42, "mrp": 45, "sq": 35, "rl": 10, "u": "pcs", "gst": 5, "bc": "8901063006066"},
    {"n": "Maggi Noodles 70g", "c": "Noodles, Pasta & Vermicelli", "b": "Maggi", "pp": 10, "sp": 14, "mrp": 14, "sq": 300, "rl": 50, "u": "pcs", "gst": 18, "bc": "8901058003012"},
    {"n": "Maggi Noodles 4-pack", "c": "Noodles, Pasta & Vermicelli", "b": "Maggi", "pp": 40, "sp": 52, "mrp": 56, "sq": 100, "rl": 20, "u": "pcs", "gst": 18, "bc": "8901058003029"},
    {"n": "Yippee Noodles 70g", "c": "Noodles, Pasta & Vermicelli", "b": "ITC", "pp": 10, "sp": 14, "mrp": 14, "sq": 150, "rl": 30, "u": "pcs", "gst": 18, "bc": "8901058003036"},
    {"n": "Top Ramen 70g", "c": "Noodles, Pasta & Vermicelli", "b": "Nestle", "pp": 10, "sp": 14, "mrp": 15, "sq": 80, "rl": 15, "u": "pcs", "gst": 18, "bc": "8901058003043"},
    {"n": "Penne Pasta 500g", "c": "Noodles, Pasta & Vermicelli", "b": "Maggi", "pp": 55, "sp": 72, "mrp": 75, "sq": 30, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901058003050"},
    {"n": "Vermicelli 200g", "c": "Noodles, Pasta & Vermicelli", "b": "Maggi", "pp": 22, "sp": 30, "mrp": 32, "sq": 40, "rl": 10, "u": "pcs", "gst": 5, "bc": "8901058003067"},
    {"n": "Lay's Classic Salted 52g", "c": "Snacks & Namkeen", "b": "Lay's", "pp": 16, "sp": 20, "mrp": 20, "sq": 200, "rl": 30, "u": "pcs", "gst": 18, "bc": "8901063003030"},
    {"n": "Lay's Magic Masala 52g", "c": "Snacks & Namkeen", "b": "Lay's", "pp": 16, "sp": 20, "mrp": 20, "sq": 200, "rl": 30, "u": "pcs", "gst": 18, "bc": "8901063003047"},
    {"n": "Haldiram's Aloo Bhujia 200g", "c": "Snacks & Namkeen", "b": "Haldiram's", "pp": 38, "sp": 48, "mrp": 50, "sq": 150, "rl": 20, "u": "pcs", "gst": 18, "bc": "8901063003023"},
    {"n": "Kurkure Masala Munch 90g", "c": "Snacks & Namkeen", "b": "Kurkure", "pp": 18, "sp": 24, "mrp": 25, "sq": 120, "rl": 20, "u": "pcs", "gst": 18, "bc": "8901063003054"},
    {"n": "Bingo Mad Angles 52g", "c": "Snacks & Namkeen", "b": "Bingo", "pp": 16, "sp": 20, "mrp": 20, "sq": 100, "rl": 15, "u": "pcs", "gst": 18, "bc": "8901063003061"},
    {"n": "Haldiram's Bhujia 200g", "c": "Snacks & Namkeen", "b": "Haldiram's", "pp": 42, "sp": 55, "mrp": 58, "sq": 80, "rl": 15, "u": "pcs", "gst": 18, "bc": "8901063003078"},
    {"n": "Too Yumm Multigrain 52g", "c": "Snacks & Namkeen", "b": "Too Yumm", "pp": 18, "sp": 24, "mrp": 25, "sq": 60, "rl": 12, "u": "pcs", "gst": 18, "bc": "8901063003085"},
    {"n": "Pringles Original 110g", "c": "Snacks & Namkeen", "b": "Pringles", "pp": 75, "sp": 99, "mrp": 105, "sq": 25, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901063003092"},
    {"n": "Act II Popcorn Butter 70g", "c": "Snacks & Namkeen", "b": "ITC", "pp": 22, "sp": 30, "mrp": 32, "sq": 50, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901063003108"},
    {"n": "Cornitos Nacho Cheese 60g", "c": "Snacks & Namkeen", "b": "Cornitos", "pp": 35, "sp": 45, "mrp": 48, "sq": 30, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901063003115"},
    {"n": "Parle-G Biscuit 80g", "c": "Biscuits & Cookies", "b": "Parle", "pp": 8, "sp": 10, "mrp": 10, "sq": 500, "rl": 100, "u": "pcs", "gst": 18, "bc": "8901063010011"},
    {"n": "Oreo Vanilla 120g", "c": "Biscuits & Cookies", "b": "Oreo", "pp": 25, "sp": 32, "mrp": 35, "sq": 200, "rl": 30, "u": "pcs", "gst": 18, "bc": "8901063010028"},
    {"n": "Britannia Good Day 250g", "c": "Biscuits & Cookies", "b": "Britannia", "pp": 35, "sp": 45, "mrp": 48, "sq": 100, "rl": 20, "u": "pcs", "gst": 18, "bc": "8901063010035"},
    {"n": "Britannia Marie Gold 250g", "c": "Biscuits & Cookies", "b": "Britannia", "pp": 22, "sp": 30, "mrp": 32, "sq": 150, "rl": 25, "u": "pcs", "gst": 18, "bc": "8901063010042"},
    {"n": "50-50 Maska Chaska 200g", "c": "Biscuits & Cookies", "b": "50-50", "pp": 25, "sp": 32, "mrp": 35, "sq": 80, "rl": 15, "u": "pcs", "gst": 18, "bc": "8901063010059"},
    {"n": "Monaco 200g", "c": "Biscuits & Cookies", "b": "Parle", "pp": 28, "sp": 36, "mrp": 38, "sq": 80, "rl": 15, "u": "pcs", "gst": 18, "bc": "8901063010066"},
    {"n": "Sunfeast Dark Fantasy 150g", "c": "Biscuits & Cookies", "b": "Sunfeast", "pp": 30, "sp": 40, "mrp": 42, "sq": 60, "rl": 12, "u": "pcs", "gst": 18, "bc": "8901063010073"},
    {"n": "Little Hearts 75g", "c": "Biscuits & Cookies", "b": "Britannia", "pp": 18, "sp": 24, "mrp": 25, "sq": 100, "rl": 15, "u": "pcs", "gst": 18, "bc": "8901063010080"},
    {"n": "Krackjack 200g", "c": "Biscuits & Cookies", "b": "Britannia", "pp": 22, "sp": 30, "mrp": 32, "sq": 80, "rl": 15, "u": "pcs", "gst": 18, "bc": "8901063010097"},
    {"n": "Marie Light Gold 250g", "c": "Biscuits & Cookies", "b": "Britannia", "pp": 25, "sp": 34, "mrp": 36, "sq": 70, "rl": 15, "u": "pcs", "gst": 18, "bc": "8901063010103"},
    {"n": "Cadbury Dairy Milk 60g", "c": "Sweets & Chocolates", "b": "Cadbury", "pp": 28, "sp": 38, "mrp": 40, "sq": 200, "rl": 30, "u": "pcs", "gst": 18, "bc": "8901058011012"},
    {"n": "KitKat 4-Finger 40g", "c": "Sweets & Chocolates", "b": "Nestle", "pp": 22, "sp": 30, "mrp": 32, "sq": 150, "rl": 25, "u": "pcs", "gst": 18, "bc": "8901058011029"},
    {"n": "Munch 35g", "c": "Sweets & Chocolates", "b": "Nestle", "pp": 8, "sp": 12, "mrp": 12, "sq": 200, "rl": 30, "u": "pcs", "gst": 18, "bc": "8901058011036"},
    {"n": "Cadbury Eclairs 30g", "c": "Sweets & Chocolates", "b": "Cadbury", "pp": 5, "sp": 8, "mrp": 10, "sq": 300, "rl": 50, "u": "pcs", "gst": 18, "bc": "8901058011043"},
    {"n": "Cadbury Silk 150g", "c": "Sweets & Chocolates", "b": "Cadbury", "pp": 120, "sp": 160, "mrp": 175, "sq": 40, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901058011050"},
    {"n": "Perk 20g", "c": "Sweets & Chocolates", "b": "Cadbury", "pp": 5, "sp": 8, "mrp": 10, "sq": 200, "rl": 30, "u": "pcs", "gst": 18, "bc": "8901058011067"},
    {"n": "Ferrero Rocher 3pcs", "c": "Sweets & Chocolates", "b": "Nestle", "pp": 85, "sp": 115, "mrp": 120, "sq": 20, "rl": 5, "u": "pcs", "gst": 18, "bc": "8901058011074"},
    {"n": "Gems 13.2g", "c": "Sweets & Chocolates", "b": "Cadbury", "pp": 8, "sp": 12, "mrp": 12, "sq": 200, "rl": 30, "u": "pcs", "gst": 18, "bc": "8901058011081"},
    {"n": "Cashew 200g", "c": "Dry Fruits & Nuts", "b": "Patanjali", "pp": 200, "sp": 260, "mrp": 280, "sq": 25, "rl": 5, "u": "kg", "gst": 5, "bc": "8901063012017"},
    {"n": "Almonds 200g", "c": "Dry Fruits & Nuts", "b": "Patanjali", "pp": 180, "sp": 240, "mrp": 255, "sq": 30, "rl": 5, "u": "kg", "gst": 5, "bc": "8901063012024"},
    {"n": "Raisins 200g", "c": "Dry Fruits & Nuts", "b": "Patanjali", "pp": 80, "sp": 110, "mrp": 120, "sq": 35, "rl": 8, "u": "kg", "gst": 5, "bc": "8901063012031"},
    {"n": "Peanut 500g", "c": "Dry Fruits & Nuts", "b": "Haldiram's", "pp": 45, "sp": 60, "mrp": 65, "sq": 80, "rl": 15, "u": "kg", "gst": 5, "bc": "8901063012048"},
    {"n": "Walnut 100g", "c": "Dry Fruits & Nuts", "b": "Patanjali", "pp": 120, "sp": 160, "mrp": 170, "sq": 15, "rl": 5, "u": "kg", "gst": 5, "bc": "8901063012055"},
    {"n": "Pista 200g", "c": "Dry Fruits & Nuts", "b": "Patanjali", "pp": 220, "sp": 290, "mrp": 310, "sq": 20, "rl": 5, "u": "kg", "gst": 5, "bc": "8901063012062"},
    {"n": "Mother's Recipe Mango Pickle 500g", "c": "Pickles & Chutneys", "b": "Mother's Recipe", "pp": 65, "sp": 85, "mrp": 90, "sq": 40, "rl": 10, "u": "pcs", "gst": 5, "bc": "8901063013014"},
    {"n": "Kissan Mixed Pickle 500g", "c": "Pickles & Chutneys", "b": "Kissan", "pp": 55, "sp": 72, "mrp": 76, "sq": 35, "rl": 10, "u": "pcs", "gst": 5, "bc": "8901063013021"},
    {"n": "Haldiram's Papad 200g", "c": "Pickles & Chutneys", "b": "Haldiram's", "pp": 30, "sp": 42, "mrp": 45, "sq": 60, "rl": 15, "u": "pcs", "gst": 5, "bc": "8901063013038"},
    {"n": "Kissan Green Chilli Pickle 200g", "c": "Pickles & Chutneys", "b": "Kissan", "pp": 32, "sp": 44, "mrp": 48, "sq": 30, "rl": 8, "u": "pcs", "gst": 5, "bc": "8901063013045"},
    {"n": "Mother's Recipe Lime Pickle 500g", "c": "Pickles & Chutneys", "b": "Mother's Recipe", "pp": 60, "sp": 80, "mrp": 85, "sq": 30, "rl": 8, "u": "pcs", "gst": 5, "bc": "8901063013052"},
    {"n": "Kissan Tomato Ketchup 500g", "c": "Sauces & Ketchup", "b": "Kissan", "pp": 55, "sp": 72, "mrp": 76, "sq": 60, "rl": 12, "u": "pcs", "gst": 18, "bc": "8901063014011"},
    {"n": "Maggi Hot & Sweet 500g", "c": "Sauces & Ketchup", "b": "Maggi", "pp": 52, "sp": 68, "mrp": 72, "sq": 50, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901063014028"},
    {"n": "Ching's Dark Soy Sauce 200ml", "c": "Sauces & Ketchup", "b": "Chings", "pp": 38, "sp": 52, "mrp": 55, "sq": 35, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901063014035"},
    {"n": "Maggi Tomato Ketchup 1kg", "c": "Sauces & Ketchup", "b": "Maggi", "pp": 85, "sp": 110, "mrp": 118, "sq": 30, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901063014042"},
    {"n": "Vinegar 500ml", "c": "Sauces & Ketchup", "b": "Chings", "pp": 25, "sp": 35, "mrp": 38, "sq": 25, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901063014059"},
    {"n": "Knorr Sweet Corn Soup 44g", "c": "Sauces & Ketchup", "b": "Knorr", "pp": 22, "sp": 30, "mrp": 32, "sq": 40, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901063014066"},
    {"n": "Ching's Schezwan Chutney 200g", "c": "Canned & Packaged Food", "b": "Chings", "pp": 42, "sp": 56, "mrp": 60, "sq": 30, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901063015011"},
    {"n": "Maggi Masala-ae-Magic 12g", "c": "Canned & Packaged Food", "b": "Maggi", "pp": 8, "sp": 12, "mrp": 12, "sq": 200, "rl": 30, "u": "pcs", "gst": 5, "bc": "8901063015028"},
    {"n": "Knorr Cup-a-Soup Tomato 38g", "c": "Canned & Packaged Food", "b": "Knorr", "pp": 20, "sp": 28, "mrp": 30, "sq": 40, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901063015035"},
    {"n": "MTR Ready to Eat Rajma 300g", "c": "Canned & Packaged Food", "b": "MTR", "pp": 52, "sp": 70, "mrp": 75, "sq": 25, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901063015042"},
    {"n": "Surf Excel 1kg", "c": "Household Cleaning", "b": "Surf Excel", "pp": 110, "sp": 140, "mrp": 145, "sq": 50, "rl": 10, "u": "kg", "gst": 18, "bc": "8901058005016"},
    {"n": "Surf Excel 500g", "c": "Household Cleaning", "b": "Surf Excel", "pp": 58, "sp": 75, "mrp": 78, "sq": 80, "rl": 15, "u": "kg", "gst": 18, "bc": "8901058005023"},
    {"n": "Rin Detergent 1kg", "c": "Household Cleaning", "b": "Rin", "pp": 55, "sp": 72, "mrp": 75, "sq": 100, "rl": 15, "u": "kg", "gst": 18, "bc": "8901058005030"},
    {"n": "Wheel Detergent 1kg", "c": "Household Cleaning", "b": "Wheel", "pp": 45, "sp": 60, "mrp": 64, "sq": 80, "rl": 15, "u": "kg", "gst": 18, "bc": "8901058005047"},
    {"n": "Vim Dishwash Liquid 500ml", "c": "Household Cleaning", "b": "Vim", "pp": 75, "sp": 99, "mrp": 105, "sq": 40, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901058005054"},
    {"n": "Vim Dishwash Bar 200g", "c": "Household Cleaning", "b": "Vim", "pp": 15, "sp": 22, "mrp": 24, "sq": 150, "rl": 25, "u": "pcs", "gst": 18, "bc": "8901058005061"},
    {"n": "Lizol Floor Cleaner 500ml", "c": "Household Cleaning", "b": "Lizol", "pp": 85, "sp": 112, "mrp": 120, "sq": 30, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901058005078"},
    {"n": "Comfort Fabric Conditioner 200ml", "c": "Household Cleaning", "b": "Comfort", "pp": 45, "sp": 60, "mrp": 65, "sq": 25, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901058005085"},
    {"n": "Harpic Power Plus 500ml", "c": "Bathroom & Toilet", "b": "Harpic", "pp": 68, "sp": 89, "mrp": 95, "sq": 35, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901058006101"},
    {"n": "Domex Toilet Cleaner 500ml", "c": "Bathroom & Toilet", "b": "Harpic", "pp": 55, "sp": 75, "mrp": 80, "sq": 30, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901058006118"},
    {"n": "Harpic Bathroom Cleaner 500ml", "c": "Bathroom & Toilet", "b": "Harpic", "pp": 60, "sp": 80, "mrp": 85, "sq": 25, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901058006125"},
    {"n": "Odonil Air Freshener 75g", "c": "Bathroom & Toilet", "b": "Odonil", "pp": 32, "sp": 44, "mrp": 48, "sq": 40, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901058006132"},
    {"n": "Dettol Soap 75g", "c": "Personal Care", "b": "Dettol", "pp": 30, "sp": 40, "mrp": 42, "sq": 200, "rl": 30, "u": "pcs", "gst": 18, "bc": "8901058006013"},
    {"n": "Lux Soap 75g", "c": "Personal Care", "b": "Lux", "pp": 28, "sp": 38, "mrp": 40, "sq": 180, "rl": 25, "u": "pcs", "gst": 18, "bc": "8901058006020"},
    {"n": "Lifebuoy Soap 75g", "c": "Personal Care", "b": "Lifebuoy", "pp": 25, "sp": 35, "mrp": 38, "sq": 200, "rl": 30, "u": "pcs", "gst": 18, "bc": "8901058006037"},
    {"n": "Pears Soap 75g", "c": "Personal Care", "b": "Pears", "pp": 35, "sp": 48, "mrp": 52, "sq": 80, "rl": 15, "u": "pcs", "gst": 18, "bc": "8901058006044"},
    {"n": "Colgate MaxFresh 150g", "c": "Personal Care", "b": "Colgate", "pp": 72, "sp": 95, "mrp": 100, "sq": 80, "rl": 15, "u": "pcs", "gst": 18, "bc": "8901058006051"},
    {"n": "Close Up 150g", "c": "Personal Care", "b": "Close Up", "pp": 65, "sp": 85, "mrp": 90, "sq": 60, "rl": 12, "u": "pcs", "gst": 18, "bc": "8901058006068"},
    {"n": "Sensodyne 100g", "c": "Personal Care", "b": "Sensodyne", "pp": 110, "sp": 145, "mrp": 155, "sq": 30, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901058006075"},
    {"n": "Head & Shoulders 180ml", "c": "Personal Care", "b": "Head & Shoulders", "pp": 145, "sp": 190, "mrp": 200, "sq": 40, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901058006082"},
    {"n": "Sunsilk 180ml", "c": "Personal Care", "b": "Sunsilk", "pp": 78, "sp": 105, "mrp": 110, "sq": 50, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901058006099"},
    {"n": "Clinic Plus 180ml", "c": "Personal Care", "b": "Clinic Plus", "pp": 75, "sp": 100, "mrp": 105, "sq": 45, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901058006105"},
    {"n": "Pantene 180ml", "c": "Personal Care", "b": "Pantene", "pp": 110, "sp": 145, "mrp": 155, "sq": 35, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901058006112"},
    {"n": "Bajaj Almond Hair Oil 100ml", "c": "Personal Care", "b": "Bajaj", "pp": 45, "sp": 60, "mrp": 65, "sq": 50, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901058006129"},
    {"n": "Dove Soap 100g", "c": "Personal Care", "b": "Nivea", "pp": 42, "sp": 56, "mrp": 60, "sq": 40, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901058006136"},
    {"n": "Nivea Body Lotion 200ml", "c": "Personal Care", "b": "Nivea", "pp": 110, "sp": 145, "mrp": 155, "sq": 25, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901058006143"},
    {"n": "Himalaya Neem Face Wash 100ml", "c": "Personal Care", "b": "Himalaya", "pp": 95, "sp": 125, "mrp": 135, "sq": 30, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901058006150"},
    {"n": "Vatika Enriched Hair Oil 100ml", "c": "Personal Care", "b": "Vatika", "pp": 55, "sp": 72, "mrp": 78, "sq": 35, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901058006167"},
    {"n": "MamyPoko Pants Medium 4pcs", "c": "Baby Care", "b": "Nestle", "pp": 90, "sp": 120, "mrp": 130, "sq": 30, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901058008011"},
    {"n": "Johnson's Baby Soap 100g", "c": "Baby Care", "b": "Nestle", "pp": 35, "sp": 48, "mrp": 52, "sq": 40, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901058008028"},
    {"n": "Johnson's Baby Powder 100g", "c": "Baby Care", "b": "Nestle", "pp": 60, "sp": 82, "mrp": 88, "sq": 25, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901058008035"},
    {"n": "Himalaya Baby Lotion 200ml", "c": "Baby Care", "b": "Himalaya", "pp": 110, "sp": 145, "mrp": 155, "sq": 20, "rl": 5, "u": "pcs", "gst": 18, "bc": "8901058008042"},
    {"n": "Pedigree Dog Food 1kg", "c": "Pet Food", "b": "Pedigree", "pp": 140, "sp": 180, "mrp": 190, "sq": 20, "rl": 5, "u": "kg", "gst": 18, "bc": "8901058009017"},
    {"n": "Whiskas Cat Food 400g", "c": "Pet Food", "b": "Whiskas", "pp": 85, "sp": 112, "mrp": 120, "sq": 15, "rl": 5, "u": "pcs", "gst": 18, "bc": "8901058009024"},
    {"n": "Drools Dog Food 1kg", "c": "Pet Food", "b": "Drools", "pp": 120, "sp": 155, "mrp": 165, "sq": 15, "rl": 5, "u": "kg", "gst": 18, "bc": "8901058009031"},
    {"n": "Aluminium Foil 9m", "c": "Kitchen Accessories", "b": "Prestige", "pp": 55, "sp": 75, "mrp": 80, "sq": 30, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901063016017"},
    {"n": "Garbage Bags 30pcs", "c": "Kitchen Accessories", "b": "Prestige", "pp": 40, "sp": 55, "mrp": 60, "sq": 40, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901063016024"},
    {"n": "Cling Wrap 30m", "c": "Kitchen Accessories", "b": "Prestige", "pp": 45, "sp": 62, "mrp": 68, "sq": 25, "rl": 8, "u": "pcs", "gst": 18, "bc": "8901063016031"},
    {"n": "Matchbox 10pcs", "c": "Kitchen Accessories", "b": "Prestige", "pp": 15, "sp": 22, "mrp": 25, "sq": 100, "rl": 20, "u": "pcs", "gst": 12, "bc": "8901063016048"},
    {"n": "Eveready Battery AA 4pcs", "c": "Stationary & Misc", "b": "Eveready", "pp": 45, "sp": 60, "mrp": 65, "sq": 50, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901063017014"},
    {"n": "Nippo Battery AA 4pcs", "c": "Stationary & Misc", "b": "Eveready", "pp": 35, "sp": 48, "mrp": 52, "sq": 40, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901063017021"},
    {"n": "Candles 10pcs", "c": "Stationary & Misc", "b": "Prestige", "pp": 15, "sp": 22, "mrp": 25, "sq": 80, "rl": 15, "u": "pcs", "gst": 12, "bc": "8901063017038"},
    {"n": "Good Knight Liquid Refill 1pc", "c": "Stationary & Misc", "b": "Good Knight", "pp": 55, "sp": 72, "mrp": 78, "sq": 40, "rl": 10, "u": "pcs", "gst": 18, "bc": "8901058007013"},
    {"n": "Hit Spray 625ml", "c": "Stationary & Misc", "b": "Hit", "pp": 110, "sp": 145, "mrp": 155, "sq": 20, "rl": 5, "u": "pcs", "gst": 18, "bc": "8901058007020"},
]


@router.post("/seed-data", status_code=status.HTTP_201_CREATED)
def seed_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    """Populate categories, brands, suppliers and products. Admin only. Idempotent."""
    import logging

    try:
        cat_map = {}
        cats_created = 0
        for name, desc in CATEGORIES:
            existing = db.query(models.Category).filter(models.Category.name == name).first()
            if existing:
                cat_map[name] = existing.category_id
            else:
                c = models.Category(name=name, description=desc)
                db.add(c)
                db.flush()
                cat_map[name] = c.category_id
                cats_created += 1

        brand_map = {}
        brands_created = 0
        for name in BRANDS:
            existing = db.query(models.Brand).filter(models.Brand.name == name).first()
            if existing:
                brand_map[name] = existing.brand_id
            else:
                b = models.Brand(name=name)
                db.add(b)
                db.flush()
                brand_map[name] = b.brand_id
                brands_created += 1

        sup_map = {}
        sups_created = 0
        for s_data in SUPPLIERS:
            existing = db.query(models.Supplier).filter(
                models.Supplier.supplier_name == s_data["supplier_name"]
            ).first()
            if existing:
                sup_map[s_data["supplier_name"]] = existing.supplier_id
            else:
                s = models.Supplier(**s_data)
                db.add(s)
                db.flush()
                sup_map[s_data["supplier_name"]] = s.supplier_id
                sups_created += 1

        supplier_names = list(sup_map.keys())

        prods_created = 0
        for i, p in enumerate(PRODUCTS):
            existing = db.query(models.Product).filter(
                (models.Product.name == p["n"]) | (models.Product.barcode == p["bc"])
            ).first()
            if existing:
                continue

            sup_name = supplier_names[i % len(supplier_names)]
            product = models.Product(
                name=p["n"],
                category_id=cat_map.get(p["c"]),
                brand_id=brand_map.get(p["b"]),
                supplier_id=sup_map.get(sup_name),
                barcode=p["bc"],
                expiry_date=date.today() + timedelta(days=180 + (i % 120)),
                purchase_price=p["pp"],
                selling_price=p["sp"],
                mrp=p["mrp"],
                gst_percent=p["gst"],
                discount_percent=0,
                stock_quantity=p["sq"],
                reorder_level=p["rl"],
                max_stock=p["sq"] * 3,
                unit=p["u"],
                is_active=True,
            )
            db.add(product)
            db.flush()

            log = models.InventoryLog(
                product_id=product.product_id,
                change_type="restock",
                quantity_change=p["sq"],
                stock_after=p["sq"],
                note="Initial stock from seed data",
            )
            db.add(log)
            prods_created += 1

        db.commit()
        return {
            "message": "Seed data loaded",
            "categories_created": cats_created,
            "brands_created": brands_created,
            "suppliers_created": sups_created,
            "products_created": prods_created,
        }
    except Exception as e:
        logging.error("seed-data error: %s", str(e))
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
