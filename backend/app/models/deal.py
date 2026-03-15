from sqlalchemy import Column, Integer, Float, String, DateTime
from app.db.session import Base
from datetime import datetime

class DealModel(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, default="Untitled Deal")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Acquirer
    acq_net_income = Column(Float)
    acq_shares = Column(Float)
    acq_share_price = Column(Float)
    
    # Target
    tgt_net_income = Column(Float)
    tgt_shares = Column(Float)
    tgt_share_price = Column(Float)
    
    # Deal Mechanics
    offer_premium_pct = Column(Float)
    cash_pct = Column(Float)
    stock_pct = Column(Float)
    debt_pct = Column(Float)
    
    pre_tax_synergies = Column(Float)
    interest_rate_debt = Column(Float)
    cost_of_cash = Column(Float)
    tax_rate = Column(Float)
    
    # Results Cash
    pro_forma_eps = Column(Float)
    accretion_dilution_pct = Column(Float)
