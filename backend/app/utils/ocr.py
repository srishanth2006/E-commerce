"""
utils/ocr.py
-------------
MODULE 5 - SMART PURCHASE BILL SCANNER (OCR)

Two responsibilities:
  1. extract_text(file_bytes, filename) -> raw text from an image or PDF
  2. parse_invoice_text(raw_text)       -> best-effort structured fields
     (supplier name, invoice number, date, GST number, line items)

OCR ENGINE:
  Uses RapidOCR (ONNX Runtime) - a pure-Python OCR that requires NO
  external binaries. For PDFs, PyMuPDF renders pages to images first.
  No Tesseract or Poppler needed.

  Dependencies (all pip-installable):
      pip install rapidocr-onnxruntime Pillow PyMuPDF
"""

import io
import re
from datetime import datetime, date
from typing import Optional

class OCRNotAvailable(Exception):
    pass


_ocr_engine = None


def _get_engine():
    global _ocr_engine
    if _ocr_engine is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            _ocr_engine = RapidOCR()
        except ImportError as e:
            raise OCRNotAvailable(
                "OCR requires 'rapidocr-onnxruntime' "
                "(pip install rapidocr-onnxruntime Pillow PyMuPDF)."
            ) from e
    return _ocr_engine


def extract_text(file_bytes: bytes, filename: str) -> str:
    """Runs OCR on an uploaded image or PDF and returns the raw text."""
    lower = filename.lower()

    if lower.endswith(".pdf"):
        return _extract_from_pdf(file_bytes)
    return _extract_from_image(file_bytes)


def _extract_from_image(file_bytes: bytes) -> str:
    engine = _get_engine()
    try:
        from PIL import Image
    except ImportError as e:
        raise OCRNotAvailable(
            "OCR requires 'Pillow' (pip install Pillow)."
        ) from e

    try:
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except Exception as e:
        raise OCRNotAvailable(
            f"Cannot read the uploaded image. Please ensure it is a valid PNG, JPG, or WEBP file. Error: {e}"
        ) from e

    try:
        import numpy as np
    except ImportError as e:
        raise OCRNotAvailable(
            "OCR requires 'numpy' (pip install numpy)."
        ) from e

    img_array = np.array(image)

    try:
        result, _ = engine(img_array)
    except Exception as e:
        raise OCRNotAvailable(
            f"OCR engine failed to process the image. "
            f"Please try a clearer image or add items manually. Error: {e}"
        ) from e

    if result is None:
        return ""
    lines = [item[1] for item in result]
    return "\n".join(lines)


def _extract_from_pdf(file_bytes: bytes) -> str:
    try:
        import fitz  # PyMuPDF
    except ImportError as e:
        raise OCRNotAvailable(
            "PDF OCR requires 'PyMuPDF' (pip install PyMuPDF)."
        ) from e

    engine = _get_engine()
    try:
        from PIL import Image
    except ImportError as e:
        raise OCRNotAvailable(
            "OCR requires 'Pillow' (pip install Pillow)."
        ) from e

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        raise OCRNotAvailable(
            f"Cannot read the uploaded PDF. Please ensure it is a valid PDF file. Error: {e}"
        ) from e

    all_lines = []

    try:
        import numpy as np
    except ImportError as e:
        raise OCRNotAvailable(
            "OCR requires 'numpy' (pip install numpy)."
        ) from e

    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(dpi=200)
        image = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        img_array = np.array(image)

        try:
            result, _ = engine(img_array)
        except Exception as e:
            continue  # skip pages that fail, process others

        if result:
            all_lines.extend(item[1] for item in result)

    doc.close()
    return "\n".join(all_lines)


# ---------------------------------------------------------------------------
# Rule-based structured field extraction
# ---------------------------------------------------------------------------
_GST_PATTERN = re.compile(r"\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z0-9]\b")  # standard Indian GSTIN format
_INVOICE_NO_PATTERN = re.compile(r"(?:invoice|bill|inv)[\s.#:no]*[-:]?\s*([A-Z0-9\-/]{3,20})", re.IGNORECASE)
_DATE_PATTERNS = [
    re.compile(r"\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b"),  # 12/05/2026 or 12-05-26
]
# Line item patterns: try multiple formats since OCR spacing varies
_ITEM_LINE_PATTERNS = [
    # Format: name   qty   price  (2+ spaces between fields)
    re.compile(
        r"^(?P<name>[A-Za-z][A-Za-z0-9 .\-]{2,60}?)\s{2,}(?P<qty>\d+(?:\.\d+)?)\s+(?P<price>\d+(?:\.\d+)?)\s*$"
    ),
    # Format: name 10 120.00  (single space, common in OCR output)
    re.compile(
        r"^(?P<name>[A-Za-z][A-Za-z0-9 .\-]{2,60}?)\s(?P<qty>\d+(?:\.\d+)?)\s+(?P<price>\d+(?:\.\d+)?)\s*$"
    ),
]


def _try_parse_date(text: str) -> Optional[date]:
    for pattern in _DATE_PATTERNS:
        m = pattern.search(text)
        if not m:
            continue
        d, mth, y = m.groups()
        y = int(y)
        if y < 100:
            y += 2000
        try:
            return date(y, int(mth), int(d))
        except ValueError:
            try:
                return date(y, int(d), int(mth))  # try swapped day/month
            except ValueError:
                continue
    return None


def parse_invoice_text(raw_text: str) -> dict:
    """
    Best-effort structured extraction. Returns a dict with:
        supplier_name, invoice_number, invoice_date, gst_number, line_items
    line_items is a list of {name, quantity, price}.

    This is intentionally conservative - if a field can't be confidently
    found, it's returned as None (or an empty list for line_items) rather
    than guessing, so the admin review screen (Module 5/6) can fill gaps.
    """
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]

    gst_match = _GST_PATTERN.search(raw_text.upper())
    gst_number = gst_match.group(0) if gst_match else None

    invoice_match = _INVOICE_NO_PATTERN.search(raw_text)
    invoice_number = invoice_match.group(1).strip() if invoice_match else None

    invoice_date = _try_parse_date(raw_text)

    # Supplier name: heuristically, the first non-empty line that isn't
    # itself the word "invoice"/"bill" and doesn't look like an address/date
    supplier_name = None
    for line in lines[:5]:
        if re.search(r"invoice|bill|gstin|date", line, re.IGNORECASE):
            continue
        if len(line) > 3:
            supplier_name = line
            break

    # Line items: scan every line for the name/qty/price pattern
    line_items = []
    seen = set()

    for i, line in enumerate(lines):
        matched = False
        for pattern in _ITEM_LINE_PATTERNS:
            m = pattern.match(line)
            if m:
                name = m.group("name").strip()
                qty = float(m.group("qty"))
                price = float(m.group("price"))
                key = (name.lower(), qty, price)
                if key not in seen and qty > 0 and price > 0:
                    seen.add(key)
                    line_items.append({"name": name, "quantity": qty, "price": price})
                matched = True
                break

        # Fallback: line has a product name but no qty/price on the same line.
        # Try multiple split patterns below.
        if not matched:
            name_match = re.match(r"^([A-Za-z][A-Za-z0-9 .\-()]{2,60}?)\s*$", line)
            if name_match and i + 1 < len(lines):
                next_line = lines[i + 1].strip()

                # Pattern A: "name\nqty price" (two numbers on next line)
                num_match = re.match(r"^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*$", next_line)
                if num_match:
                    name = name_match.group(1).strip()
                    qty = float(num_match.group(1))
                    price = float(num_match.group(2))
                    key = (name.lower(), qty, price)
                    if key not in seen and qty > 0 and price > 0:
                        seen.add(key)
                        line_items.append({"name": name, "quantity": qty, "price": price})
                        continue

                # Pattern D (table): try BEFORE Pattern B to avoid
                # misidentifying HSN+qty as qty+price.
                # Scans ahead for a sequence of numeric-only lines (table columns).
                raw_nums = []
                for j in range(i + 1, min(i + 8, len(lines))):
                    s = lines[j].strip()
                    if re.match(r"^\d+(?:\.\d+)?$", s):
                        raw_nums.append(s)
                    else:
                        break
                if len(raw_nums) >= 3:
                    qty_val = None
                    rate_val = None
                    for s in raw_nums:
                        has_dot = "." in s
                        n = float(s)
                        if has_dot and n >= 1 and rate_val is None:
                            rate_val = n
                        elif not has_dot and 1 <= n <= 500 and qty_val is None:
                            qty_val = n
                    if qty_val is not None and rate_val is not None:
                        key = (name_match.group(1).strip().lower(), qty_val, rate_val)
                        if key not in seen:
                            seen.add(key)
                            line_items.append({
                                "name": name_match.group(1).strip(),
                                "quantity": qty_val,
                                "price": rate_val,
                            })
                            continue

                # Pattern B: "name\nqty\nprice" (qty and price on separate lines)
                if i + 2 < len(lines):
                    qty_line = next_line
                    price_line = lines[i + 2].strip()
                    qty_match = re.match(r"^(\d+)\s*$", qty_line)
                    price_match = re.match(r"^(\d+(?:\.\d+)?)\s*$", price_line)
                    if qty_match and price_match:
                        qty = float(qty_match.group(1))
                        price = float(price_match.group(1))
                        key = (name_match.group(1).strip().lower(), qty, price)
                        if key not in seen and qty > 0 and price > 0:
                            seen.add(key)
                            line_items.append({
                                "name": name_match.group(1).strip(),
                                "quantity": qty,
                                "price": price,
                            })
                            continue

                # Pattern C: "name\nmergedNumber" where OCR merged qty+price
                concat = re.match(r"^(\d+\.?\d*)\s*$", next_line)
                if concat:
                    val = concat.group(1)
                    dot_pos = val.find(".")
                    if dot_pos > 0:
                        int_part = val[:dot_pos]
                        dec_part = val[dot_pos:]
                        candidates = []
                        for split in range(1, len(int_part)):
                            q_str = int_part[:split]
                            p_str = int_part[split:] + dec_part
                            try:
                                qty_f = float(q_str)
                                price_f = float(p_str)
                                if qty_f > 0 and price_f > 0:
                                    candidates.append((qty_f, price_f))
                            except ValueError:
                                continue
                        best = None
                        for qty_f, price_f in candidates:
                            if 10 <= price_f <= 500 and 1 <= qty_f <= 200:
                                if best is None:
                                    best = (qty_f, price_f)
                                else:
                                    if price_f == best[1] and qty_f > best[0]:
                                        best = (qty_f, price_f)
                                    elif price_f != best[1] and price_f % 10 == 0 and best[1] % 10 != 0:
                                        best = (qty_f, price_f)
                        if best:
                            qty_f, price_f = best
                            key = (name_match.group(1).strip().lower(), qty_f, price_f)
                            if key not in seen:
                                seen.add(key)
                                line_items.append({
                                    "name": name_match.group(1).strip(),
                                    "quantity": qty_f,
                                    "price": price_f,
                                })

    return {
        "supplier_name": supplier_name,
        "invoice_number": invoice_number,
        "invoice_date": invoice_date,
        "gst_number": gst_number,
        "line_items": line_items,
    }
