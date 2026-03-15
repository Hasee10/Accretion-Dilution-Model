import pytest
from app.schemas.dcf import DCFInput
from app.core.dcf_logic import DCFModel

def test_dcf_baseline_valuation():
    """
    Test standard DCF valuation math.
    Assumes:
    - $100 base revenue, 10% annual growth
    - 20% EBITDA margin
    - 21% Tax Rate
    - 10% WACC
    - 2% Terminal Growth
    - 10x Exit Multiple
    - $50 Debt, $20 Cash, 10 Shares
    """
    
    payload = DCFInput(
        revenue_base=100.0,
        revenue_growth=0.10,
        ebitda_margins=0.20,
        tax_rate=0.21,
        wacc=0.10,
        terminal_growth_rate=0.02,
        exit_multiple=10.0,
        total_debt=50.0,
        cash=20.0,
        shares_outstanding=10.0
    )
    
    model = DCFModel(dcf_data=payload)
    results = model.execute()
    
    # 1. Check FCF projections
    # Year 1 Rev = 110. EBITDA = 22. FCF = 22 * (1 - 0.21) = 17.38
    assert results.projected_revenues[0] == pytest.approx(110.0)
    assert results.projected_ebitda[0] == pytest.approx(22.0)
    assert results.projected_fcf[0] == pytest.approx(17.38)
    
    # 2. Check PGM Math
    # Year 5 FCF = Base(100) * (setup_years)
    # Rev5 = 100 * (1.1^5) = 161.051
    # EBITDA5 = 32.2102
    # FCF5 = 25.446
    
    assert results.projected_revenues[-1] == pytest.approx(161.051)
    
    # TV PGM = (25.446 * 1.02) / (0.10 - 0.02) = 25.955 / 0.08 = 324.437
    assert results.terminal_value_pgm == pytest.approx(324.438, rel=1e-3)
    
    # 3. Check EMM Math
    # TV EMM = EBITDA5(32.210) * 10 = 322.102
    assert results.terminal_value_emm == pytest.approx(322.102, rel=1e-3)
    
    # 4. Check Bridges
    # EV = PV(FCFs) + PV(TV)
    # Equity = EV + 20(cash) - 50(debt) = EV - 30
    assert results.equity_value_pgm == pytest.approx(results.enterprise_value_pgm - 30.0)
    assert results.equity_value_emm == pytest.approx(results.enterprise_value_emm - 30.0)
    
    # Price
    assert results.share_price_pgm == pytest.approx(results.equity_value_pgm / 10.0)
