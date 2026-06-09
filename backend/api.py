from flask import Flask, request, send_file
from flask_cors import CORS

from ai.prompt_engine import generate_techpack
from pdf.pdf_builder import create_pdf

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return "Techpack API Running"


@app.route("/generate", methods=["POST"])
def generate():
    try:
        print("🔥 Request received")

        data = request.json
        prompt = data.get("prompt")

        tech_data = generate_techpack(prompt)
        print("AI DATA:", tech_data)

        file_path = "output.pdf"
        create_pdf(tech_data, file_path)

        print("✅ PDF created")

        return send_file(file_path, as_attachment=True)

    except Exception as e:
        print("❌ ERROR:", str(e))
        return {"error": str(e)}, 500


if __name__ == "__main__":
    app.run(debug=True)