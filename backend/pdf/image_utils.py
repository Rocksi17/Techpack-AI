from PIL import Image

def overlay_logo(base_path, logo_path, output_path, position="left_chest", size=60):
    base = Image.open(base_path).convert("RGBA")
    logo = Image.open(logo_path).convert("RGBA")

    # Resize logo
    logo = logo.resize((size, size))

    W, H = base.width, base.height

    # 🎯 Smart placement zones
    if position == "left_chest":
        x = int(W * 0.32)
        y = int(H * 0.28)

    elif position == "right_chest":
        x = int(W * 0.58)
        y = int(H * 0.28)

    elif position == "center":
        x = int(W * 0.45)
        y = int(H * 0.40)

    elif position == "back":
        x = int(W * 0.45)
        y = int(H * 0.35)

    else:
        x, y = 10, 10  # fallback

    base.paste(logo, (x, y), logo)
    base.save(output_path)