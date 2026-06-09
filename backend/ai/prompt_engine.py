import os
import json
import re
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def fallback_data(prompt):
    prompt = prompt.lower()

    if "jacket" in prompt:
        garment = "jacket"
    elif "tshirt" in prompt or "t-shirt" in prompt:
        garment = "tshirt"
    else:
        garment = "hoodie"

    return {
    "brand": "Teckpack",
    "style_name": f"{garment.title()} Design",
    "garment": garment,
    "fit": "oversized",

    "measurements": {
        "XS": {"chest": 105, "length": 68, "sleeve": 58},
        "S":  {"chest": 110, "length": 70, "sleeve": 60},
        "M":  {"chest": 115, "length": 72, "sleeve": 62},
        "L":  {"chest": 120, "length": 75, "sleeve": 64},
        "XL": {"chest": 125, "length": 78, "sleeve": 66},
        "XXL":{"chest": 130, "length": 80, "sleeve": 68}
    },

    "tolerance": {
        "chest": "±2 cm",
        "length": "±1.5 cm",
        "sleeve": "±1 cm"
    },

    "fabric": {
        "type": "cotton fleece",
        "gsm": "320",
        "composition": "100% cotton"
    },

    "logo": {
        "position": "left_chest",
        "size": 60,
        "scale": 0.8,
        "x": 120,
        "y": 200
    },

    "construction": [
        "double stitch seams",
        "ribbed cuffs",
        "kangaroo pocket"
    ],

    "bom": [
        {
            "item": "Main Fabric",
            "description": "Cotton fleece 320 GSM",
            "supplier": "Local Mill"
        },
        {
            "item": "Rib",
            "description": "1x1 rib",
            "supplier": "Trim Supplier"
        },
        {
            "item": "Zipper",
            "description": "YKK metal zipper",
            "supplier": "YKK"
        },
        {
            "item": "Thread",
            "description": "Polyester thread",
            "supplier": "Coats"
        },
        {
            "item": "Label",
            "description": "Woven label",
            "supplier": "Label Co"
        }
    ],

    "packaging": {
        "bag_width": 55,
        "bag_height": 32,
        "qty_per_bag": 6,
        "total_qty": 36,
        "box_length": 52,
        "box_width": 42,
        "box_height": 20
    },

    "colorways": ["black", "grey", "navy"]
}


def generate_techpack(prompt):

    # 🔥 TEMP: skip OpenAI for development
    USE_AI = False

    if not USE_AI:
        print("⚡ Using fallback techpack")
        return fallback_data(prompt)

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Return ONLY JSON for a fashion tech pack."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        content = response.choices[0].message.content

        match = re.search(r"\{.*\}", content, re.DOTALL)

        if match:
            return json.loads(match.group())

    except Exception as e:
        print("❌ AI ERROR:", e)

    return fallback_data(prompt)