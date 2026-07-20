"""
routers/reports.py
---------------------
MODULE 17 - REPORTS (CSV + Excel export)

CSV export uses only Python's built-in `csv` module - zero dependencies.
Excel export uses `openpyxl` (pip install openpyxl) - a lightweight,
pure-Python library, much lighter than pandas for this use case.
PDF export of reports reuses the same print-friendly approach as
invoices (Module 10) - see frontend Reports page "Print / Save as PDF".
"""

import csv
import io
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app import models
from app.auth import get_current_staff_user
from app.database import get_db

router = APIRouter(prefix="/reports", tags=["Reports"], dependencies=[Depends(get_current_staff_user)])


def _csv_response(rows: list, headers: list, filename: str) -> StreamingResponse:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _excel_response(rows: list, headers: list, filename: str) -> StreamingResponse:
    try:
        from openpyxl import Workbook
    except ImportError:
        # Fall back to CSV with a note, rather than a hard error, since the
        # data itself is still useful even without the nicer .xlsx format.
        return _csv_response(rows, headers, filename.replace(".xlsx", ".csv"))

    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for row in rows:
        ws.append(row)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _respond(rows, headers, base_filename, fmt):
    if fmt == "excel":
        return _excel_response(rows, headers, f"{base_filename}.xlsx")
    return _csv_response(rows, headers, f"{base_filename}.csv")


@router.get("/sales")
def sales_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    format: str = Query("csv", pattern="^(csv|excel)$"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Sale).options(joinedload(models.Sale.customer))
    if start_date:
        query = query.filter(models.Sale.sale_date >= start_date)
    if end_date:
        query = query.filter(models.Sale.sale_date <= end_date + timedelta(days=1))

    sales = query.order_by(models.Sale.sale_date.desc()).all()
    rows = [
        [
            s.sale_id, s.sale_date.strftime("%Y-%m-%d %H:%M"),
            s.customer.name if s.customer else "Walk-in",
            s.subtotal, s.discount, s.gst_amount, s.grand_total, s.payment_method,
        ]
        for s in sales
    ]
    headers = ["Sale ID", "Date", "Customer", "Subtotal", "Discount", "GST", "Grand Total", "Payment Method"]
    return _respond(rows, headers, "sales_report", format)


@router.get("/purchases")
def purchases_report(format: str = Query("csv", pattern="^(csv|excel)$"), db: Session = Depends(get_db)):
    bills = (
        db.query(models.PurchaseBill)
        .options(joinedload(models.PurchaseBill.supplier))
        .order_by(models.PurchaseBill.created_at.desc())
        .all()
    )
    rows = [
        [
            b.id, b.created_at.strftime("%Y-%m-%d"),
            b.supplier.supplier_name if b.supplier else "-",
            b.invoice_number or "-", b.source, b.total_amount,
        ]
        for b in bills
    ]
    headers = ["Bill ID", "Date", "Supplier", "Invoice #", "Source", "Total Amount"]
    return _respond(rows, headers, "purchases_report", format)


@router.get("/inventory")
def inventory_report(format: str = Query("csv", pattern="^(csv|excel)$"), db: Session = Depends(get_db)):
    products = db.query(models.Product).options(joinedload(models.Product.category)).order_by(models.Product.name).all()
    rows = [
        [
            p.product_id, p.name, p.category.name if p.category else "-",
            p.stock_quantity, p.reorder_level, p.unit, p.purchase_price, p.selling_price,
            p.expiry_date.isoformat() if p.expiry_date else "-",
        ]
        for p in products
    ]
    headers = ["ID", "Name", "Category", "Stock", "Reorder Level", "Unit", "Purchase Price", "Selling Price", "Expiry Date"]
    return _respond(rows, headers, "inventory_report", format)


@router.get("/suppliers")
def suppliers_report(format: str = Query("csv", pattern="^(csv|excel)$"), db: Session = Depends(get_db)):
    suppliers = db.query(models.Supplier).order_by(models.Supplier.supplier_name).all()
    rows = [
        [s.supplier_id, s.supplier_name, s.contact_person or "-", s.phone or "-", s.email or "-", s.gst_number or "-"]
        for s in suppliers
    ]
    headers = ["ID", "Supplier Name", "Contact Person", "Phone", "Email", "GST Number"]
    return _respond(rows, headers, "suppliers_report", format)


@router.get("/customers")
def customers_report(format: str = Query("csv", pattern="^(csv|excel)$"), db: Session = Depends(get_db)):
    customers = db.query(models.Customer).order_by(models.Customer.name).all()
    rows = [
        [c.customer_id, c.name, c.phone or "-", c.email or "-", c.loyalty_points]
        for c in customers
    ]
    headers = ["ID", "Name", "Phone", "Email", "Loyalty Points"]
    return _respond(rows, headers, "customers_report", format)
