from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    PageBreak
)

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4

import os

from pdf.sketch_selector import get_sketch_paths
from pdf.image_utils import overlay_logo
from ai.image_generator import generate_ai_sketch


# =========================================
# PAGE SIZE
# =========================================

PAGE_WIDTH, PAGE_HEIGHT = A4


# =========================================
# REUSABLE PAGE TEMPLATE
# =========================================

def draw_page_template(canvas, doc):

    canvas.saveState()

    # =========================
    # OUTER BORDER
    # =========================

    canvas.setLineWidth(1)

    canvas.rect(
        15,
        15,
        PAGE_WIDTH - 30,
        PAGE_HEIGHT - 30
    )

    # =========================
    # HEADER BOX
    # =========================

    top_y = PAGE_HEIGHT - 120

    canvas.rect(
        20,
        top_y,
        PAGE_WIDTH - 40,
        90
    )

    # HORIZONTAL LINES

    canvas.line(
        20,
        top_y + 60,
        PAGE_WIDTH - 20,
        top_y + 60
    )

    canvas.line(
        20,
        top_y + 30,
        PAGE_WIDTH - 20,
        top_y + 30
    )

    # VERTICAL LINE

    canvas.line(
        300,
        top_y,
        300,
        top_y + 90
    )

    # =========================
    # LABELS
    # =========================

    canvas.setFont("Helvetica-Bold", 10)

    canvas.drawString(30, top_y + 68, "DESCRIPTION:")
    canvas.drawString(30, top_y + 38, "STYLE NO:")
    canvas.drawString(320, top_y + 38, "SEASON:")
    canvas.drawString(30, top_y + 8, "DATE CREATED:")
    canvas.drawString(320, top_y + 8, "DATE MODIFIED:")

    # =========================
    # MAIN TITLE
    # =========================

    canvas.setFont("Helvetica-Bold", 22)

    canvas.drawRightString(
        PAGE_WIDTH - 30,
        PAGE_HEIGHT - 50,
        "TECH PACK"
    )

    # =========================
    # PAGE NUMBER
    # =========================

    canvas.setFont("Helvetica", 10)

    canvas.drawRightString(
        PAGE_WIDTH - 30,
        25,
        f"Page {doc.page}"
    )

    canvas.restoreState()


# =========================================
# MAIN PDF FUNCTION
# =========================================

def create_pdf(data, filename="techpack.pdf"):

    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        topMargin=140,
        bottomMargin=40,
        leftMargin=30,
        rightMargin=30
    )

    styles = getSampleStyleSheet()

    # =========================================
    # CUSTOM STYLES
    # =========================================

    title_style = ParagraphStyle(
        'TitleStyle',
        fontSize=20,
        alignment=TA_CENTER,
        spaceAfter=10,
        leading=22
    )

    section_style = ParagraphStyle(
        'SectionStyle',
        fontSize=14,
        spaceBefore=10,
        spaceAfter=6
    )

    normal_style = styles['Normal']

    elements = []

    # =========================================
    # PAGE 1
    # =========================================

    elements.append(
        Paragraph("TECH PACK OVERVIEW", title_style)
    )

    # =========================================
    # HEADER TABLE
    # =========================================

    header_table = Table([
        ["Brand", data["brand"]],
        ["Style", data["style_name"]],
        ["Garment", data["garment"]],
        ["Fit", data["fit"]],
    ], colWidths=[120, 250])

    header_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
    ]))

    elements.append(header_table)
    elements.append(Spacer(1, 15))

    # =========================================
    # AI SKETCH
    # =========================================

    elements.append(
        Paragraph("GARMENT SKETCH (AI GENERATED)", section_style)
    )

    front_out = os.path.join(
        os.path.dirname(__file__),
        "..",
        "assets",
        "ai_front.png"
    )

    back_out = os.path.join(
        os.path.dirname(__file__),
        "..",
        "assets",
        "ai_back.png"
    )

    try:

        generate_ai_sketch(
            data["garment"] + " front",
            front_out
        )

        generate_ai_sketch(
            data["garment"] + " back",
            back_out
        )

        front_img = Image(front_out, width=180, height=180)
        back_img = Image(back_out, width=180, height=180)

        sketch_table = Table([
            ["FRONT VIEW", "BACK VIEW"],
            [front_img, back_img]
        ])

        sketch_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey)
        ]))

        elements.append(sketch_table)

    except Exception as e:

        elements.append(
            Paragraph(
                f"AI Image error: {str(e)}",
                normal_style
            )
        )

    elements.append(Spacer(1, 20))

    # =========================================
    # PAGE 2
    # =========================================

    elements.append(PageBreak())

    elements.append(
        Paragraph("MEASUREMENT SHEET", title_style)
    )

    elements.append(
        Paragraph(
            "MEASUREMENT SPEC (WITH TOLERANCE)",
            section_style
        )
    )

    table_data = [
        ["Size", "Chest (cm)", "Length (cm)", "Sleeve (cm)"]
    ]

    for size, values in data["measurements"].items():

        table_data.append([
            size,
            values["chest"],
            values["length"],
            values["sleeve"]
        ])

    meas_table = Table(
        table_data,
        colWidths=[60, 100, 100, 100]
    )

    meas_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.black),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))

    elements.append(meas_table)
    elements.append(Spacer(1, 10))

    # =========================================
    # TOLERANCE TABLE
    # =========================================

    tolerance_data = [
        ["Measurement", "Tolerance"],
        ["Chest", data["tolerance"]["chest"]],
        ["Length", data["tolerance"]["length"]],
        ["Sleeve", data["tolerance"]["sleeve"]],
    ]

    tol_table = Table(
        tolerance_data,
        colWidths=[150, 150]
    )

    tol_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
    ]))

    elements.append(tol_table)
    elements.append(Spacer(1, 15))

    # =========================================
    # PAGE 3
    # =========================================

    elements.append(PageBreak())

    elements.append(
        Paragraph(
            "MATERIALS & CONSTRUCTION",
            title_style
        )
    )

    # =========================================
    # FABRIC DETAILS
    # =========================================

    elements.append(
        Paragraph("FABRIC DETAILS", section_style)
    )

    fabric_table = Table([
        ["Type", data["fabric"]["type"]],
        ["GSM", data["fabric"]["gsm"]],
        ["Composition", data["fabric"]["composition"]],
    ], colWidths=[120, 250])

    fabric_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
    ]))

    elements.append(fabric_table)
    elements.append(Spacer(1, 15))

    # =========================================
    # CONSTRUCTION NOTES
    # =========================================

    elements.append(
        Paragraph("CONSTRUCTION NOTES", section_style)
    )

    for item in data["construction"]:

        elements.append(
            Paragraph(f"• {item}", normal_style)
        )

    elements.append(Spacer(1, 15))

    # =========================================
    # BOM TABLE
    # =========================================

    elements.append(
        Paragraph("BILL OF MATERIALS (BOM)", section_style)
    )

    bom_data = [["Item", "Description", "Supplier"]]

    for item in data["bom"]:

        bom_data.append([
            item["item"],
            item["description"],
            item["supplier"]
        ])

    bom_table = Table(
        bom_data,
        colWidths=[120, 200, 100]
    )

    bom_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.black),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
    ]))

    elements.append(bom_table)
    elements.append(Spacer(1, 15))

    # =========================================
    # COLORWAYS
    # =========================================

    elements.append(
        Paragraph("COLORWAYS", section_style)
    )

    for color in data["colorways"]:

        elements.append(
            Paragraph(f"• {color}", normal_style)
        )

    elements.append(PageBreak())
    packaging_flat_page(elements, data, styles)

    elements.append(PageBreak())
    packaging_3d_page(elements, data, styles)

  
    # =========================================
    # BUILD PDF
    # =========================================

    doc.build(
        elements,
        onFirstPage=draw_page_template,
        onLaterPages=draw_page_template
    )

def packaging_flat_page(elements, data, styles):

    section = styles["Heading2"]

    elements.append(
        Paragraph("PACKAGING DETAIL", section)
    )

    pkg = data["packaging"]

    flat_table = Table([
        ["Bag Width", f'{pkg["bag_width"]} CM'],
        ["Bag Height", f'{pkg["bag_height"]} CM'],
        ["Qty / Bag", pkg["qty_per_bag"]],
        ["Total Qty", pkg["total_qty"]],
    ], colWidths=[200, 200])

    flat_table.setStyle(TableStyle([
        ("GRID", (0,0), (-1,-1), 1, colors.black),
        ("BACKGROUND", (0,0), (0,-1), colors.lightgrey)
    ]))

    elements.append(flat_table)
    elements.append(Spacer(1, 30))

def packaging_3d_page(elements, data, styles):

    section = styles["Heading2"]

    elements.append(
        Paragraph("3D PACKAGING VIEW", section)
    )

    pkg = data["packaging"]

    info = f"""
    BOX SIZE:
    {pkg["box_length"]} x
    {pkg["box_width"]} x
    {pkg["box_height"]} CM
    """

    elements.append(
        Paragraph(info, styles["Normal"])
    )

    elements.append(Spacer(1, 20))

    note = f"""
    Place {pkg["qty_per_bag"]} garments
    into plastic bag.

    Total garments:
    {pkg["total_qty"]}
    """

    elements.append(
        Paragraph(note, styles["Normal"])
    )

    # =========================================
    # LOGO SETTINGS
    # =========================================

    logo_scale = data["logo"]["scale"]

    logo_width = 200 * logo_scale
    logo_height = 80 * logo_scale

    # OPTIONAL POSITION
    logo_x = data["logo"]["x"]
    logo_y = data["logo"]["y"]

    # =========================================
    # EMPTY FIELDS
    # =========================================

    info = f"""
    STYLE # : <br/><br/>
    COLOUR : <br/><br/>
    QTY : <br/><br/>
    G.W : <br/><br/>
    N.W : <br/><br/>
    MEAS : <br/><br/>

    BOX SIZE : 
    {pkg["box_length"]} x
    {pkg["box_width"]} x
    {pkg["box_height"]} CM
    """

    elements.append(
        Paragraph(info, styles["Normal"])
    )