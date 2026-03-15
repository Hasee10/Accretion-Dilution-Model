from pydantic import BaseModel, ConfigDict, Field


class LBOInput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    entry_ev: float = Field(..., description="Entry Enterprise Value, $M")
    entry_ebitda: float = Field(..., description="Entry EBITDA, $M")
    exit_multiple: float = Field(..., description="Exit EV / EBITDA multiple")
    hold_period: int = Field(..., description="Hold period in years")
    debt_pct: float = Field(..., description="Debt funded % of EV")
    interest_rate: float = Field(..., description="Blended interest rate")
    ebitda_growth_rate: float = Field(..., description="Annual EBITDA growth")
    revenue_at_entry: float = Field(..., description="Revenue at entry")
    management_fee_pct: float = Field(0.02, description="Annual management fee as % of equity")


class LBOResponse(BaseModel):
    status: str = "ok"
    entry_multiple: float
    entry_equity: float
    entry_debt: float
    exit_ebitda: float
    exit_ev: float
    exit_equity: float
    remaining_debt: float
    annual_debt_paydown: float
    total_interest: float
    annual_fee: float
    moic: float
    irr: float
    fee_drag_on_irr: float
    sensitivity: dict
    irr_bridge: dict
