import os

def get_sketch_paths(garment):
    base = os.path.join(os.path.dirname(__file__), "..", "assets")
    garment = garment.lower()

    if "jacket" in garment:
        return (
            os.path.join(base, "jacket_front.png"),
            os.path.join(base, "jacket_back.png")
        )

    elif "tshirt" in garment:
        return (
            os.path.join(base, "tshirt_front.png"),
            os.path.join(base, "tshirt_back.png")
        )

    else:
        return (
            os.path.join(base, "hoodie_front.png"),
            os.path.join(base, "hoodie_back.png")
        )