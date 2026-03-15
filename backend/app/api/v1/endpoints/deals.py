from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.deal import DealModel
from app.schemas.deal import DealCreate, DealResponse
from app.core.finance_logic import AccretionDilutionModel
from fastapi.responses import StreamingResponse
import pandas as pd
import io
import yfinance as yf

router = APIRouter()

@router.get("/finance/ticker/{ticker}")
def get_ticker_data(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        net_income = info.get("netIncomeToCommon", 0) / 1_000_000 if info.get("netIncomeToCommon") else 0
        shares = info.get("sharesOutstanding", 0) / 1_000_000 if info.get("sharesOutstanding") else 0
        price = info.get("currentPrice", 0) or info.get("regularMarketPrice", 0)
        
        return {
            "net_income": net_income,
            "shares": shares,
            "share_price": price
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/save-deal", response_model=DealResponse)
def save_deal(deal: DealCreate, db: Session = Depends(get_db)):
    # Run the math to save results too
    model = AccretionDilutionModel(deal_data=deal)
    results = model.calculate()
    
    db_deal = DealModel(
        name=deal.name,
        acq_net_income=deal.acq_net_income,
        acq_shares=deal.acq_shares,
        acq_share_price=deal.acq_share_price,
        tgt_net_income=deal.tgt_net_income,
        tgt_shares=deal.tgt_shares,
        tgt_share_price=deal.tgt_share_price,
        offer_premium_pct=deal.offer_premium_pct,
        cash_pct=deal.cash_pct,
        stock_pct=deal.stock_pct,
        debt_pct=deal.debt_pct,
        pre_tax_synergies=deal.pre_tax_synergies,
        interest_rate_debt=deal.interest_rate_debt,
        cost_of_cash=deal.cost_of_cash,
        tax_rate=deal.tax_rate,
        pro_forma_eps=results.get("Pro-Forma EPS"),
        accretion_dilution_pct=results.get("Accretion/Dilution Percentage")
    )
    db.add(db_deal)
    db.commit()
    db.refresh(db_deal)
    return db_deal

@router.get("/deals", response_model=list[DealResponse])
def get_deals(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    deals = db.query(DealModel).order_by(DealModel.id.desc()).offset(skip).limit(limit).all()
    return deals

@router.get("/deals/{deal_id}/export")
def export_deal(deal_id: int, db: Session = Depends(get_db)):
    deal = db.query(DealModel).filter(DealModel.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
        
    # Re-run logic for full report
    deal_input = DealCreate(**deal.__dict__)
    model = AccretionDilutionModel(deal_data=deal_input)
    results = model.calculate()
    
    # Create Excel
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Assumptions sheet
        assump_df = pd.DataFrame([
            {"Parameter": "Acquirer Net Income", "Value": deal.acq_net_income},
            {"Parameter": "Acquirer Shares", "Value": deal.acq_shares},
            {"Parameter": "Acquirer Share Price", "Value": deal.acq_share_price},
            {"Parameter": "Target Net Income", "Value": deal.tgt_net_income},
            {"Parameter": "Target Shares", "Value": deal.tgt_shares},
            {"Parameter": "Target Share Price", "Value": deal.tgt_share_price},
            {"Parameter": "Offer Premium %", "Value": deal.offer_premium_pct},
            {"Parameter": "Cash Mix %", "Value": deal.cash_pct},
            {"Parameter": "Stock Mix %", "Value": deal.stock_pct},
            {"Parameter": "Debt Mix %", "Value": deal.debt_pct},
            {"Parameter": "Pre-tax Synergies", "Value": deal.pre_tax_synergies},
        ])
        assump_df.to_excel(writer, sheet_name='Assumptions', index=False)
        
        # Results sheet
        results_df = pd.DataFrame([
            {"Metric": k, "Value": v} for k, v in results.items()
        ])
        results_df.to_excel(writer, sheet_name='Outputs', index=False)
        
    output.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="Deal_Export_{deal.id}.xlsx"'
    }
    
    return StreamingResponse(output, headers=headers, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
