from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator

class DealInput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    acq_net_income: float = Field(..., description="Acquirer Net Income")
    acq_shares: float = Field(..., description="Acquirer Shares Outstanding")
    acq_share_price: float = Field(..., description="Acquirer Share Price")
    
    tgt_net_income: float = Field(..., description="Target Net Income")
    tgt_shares: float = Field(..., description="Target Shares Outstanding")
    tgt_share_price: float = Field(..., description="Target Share Price")
    
    offer_premium_pct: float = Field(..., description="Offer Premium (%)")
    cash_pct: float = Field(..., description="% Cash")
    stock_pct: float = Field(..., description="% Stock")
    debt_pct: float = Field(..., description="% Debt")
    
    pre_tax_synergies: float = Field(0.0, description="Pre-tax Synergies")
    interest_rate_debt: float = Field(0.0, description="Interest Rate on New Debt")
    cost_of_cash: float = Field(0.0, description="Foregone Interest on Cash")
    tax_rate: float = Field(0.25, description="Marginal Tax Rate")

    # Advanced Inputs
    cost_to_achieve: float = Field(0.0, description="One-time cash outflow to achieve synergies")
    new_da: float = Field(0.0, description="New Depreciation & Amortization Write-ups")

    @model_validator(mode='after')
    def check_mix_sum(self):
        total_mix = self.cash_pct + self.stock_pct + self.debt_pct
        if round(total_mix, 4) != 1.0:
            raise ValueError(f"Funding mix must sum to 100% (1.0). Got {total_mix}")
        return self

class DealCreate(DealInput):
    name: str = Field("Untitled Deal", description="Name of the deal analysis")

class DealResponse(DealCreate):
    id: int
    pro_forma_eps: float | None = None
    accretion_dilution_pct: float | None = None
    
    # Advanced Outputs
    acq_pe: float | None = None
    tgt_pe: float | None = None
    effective_tgt_pe: float | None = None
    
    synergy_phasing: List[Dict[str, Any]] | None = None
    sensitivity_synergy_premium: List[Dict[str, Any]] | None = None
    sensitivity_price_debt: List[Dict[str, Any]] | None = None
    
    model_config = ConfigDict(from_attributes=True)

