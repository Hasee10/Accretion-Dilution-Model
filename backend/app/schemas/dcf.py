from pydantic import BaseModel, ConfigDict, Field

class DCFInput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    # Operational Inputs
    revenue_base: float = Field(..., description="Year 0 Base Revenue")
    revenue_growth: float = Field(..., description="Projected Revenue Growth Rate")
    ebitda_margins: float = Field(..., description="Projected EBITDA Margin")
    tax_rate: float = Field(..., description="Effective Tax Rate")
    
    # Capital Structure & Discount Rate
    wacc: float = Field(..., description="Weighted Average Cost of Capital (WACC)")
    
    # Valuation Assumptions
    terminal_growth_rate: float = Field(..., description="Terminal Growth Rate (PGM)")
    exit_multiple: float = Field(..., description="Exit EBITDA Multiple (EMM)")
    
    # Enterprise to Equity Bridge
    total_debt: float = Field(..., description="Total Debt Outstanding")
    cash: float = Field(..., description="Total Cash and Equivalents")
    shares_outstanding: float = Field(..., description="Basic Shares Outstanding")

class DCFResponse(BaseModel):
    status: str = "ok"
    # Detailed 5-year projections
    projected_years: list[int]
    projected_revenues: list[float]
    projected_ebitda: list[float]
    projected_fcf: list[float]
    pv_of_fcf: list[float]
    sum_pv_fcf: float
    
    # Valuation Results (PGM Method)
    terminal_value_pgm: float
    pv_tv_pgm: float
    enterprise_value_pgm: float
    equity_value_pgm: float
    share_price_pgm: float
    
    # Valuation Results (EMM Method)
    terminal_value_emm: float
    pv_tv_emm: float
    enterprise_value_emm: float
    equity_value_emm: float
    share_price_emm: float
    
    # 2D Matrices
    sensitivity_wacc_tgr: list[dict]
    sensitivity_wacc_emm: list[dict]
