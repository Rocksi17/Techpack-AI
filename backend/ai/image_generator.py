import os
from PIL import Image, ImageDraw

# ⚠️ Temporary fallback AI (until API active)
def generate_ai_sketch(prompt, output_path):
    """
    Fake AI sketch generator (placeholder)
    Later we connect real model
    """

    img = Image.new("RGB", (512, 512), color="white")
    draw = ImageDraw.Draw(img)

    # Simple placeholder drawing
    draw.rectangle([150, 100, 350, 400], outline="black", width=3)
    draw.text((180, 50), prompt[:20], fill="black")

    img.save(output_path)

    return output_path