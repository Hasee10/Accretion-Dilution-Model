import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from app.schemas.deal import DealInput
from app.core.finance_logic import AccretionDilutionModel

def test_dilutive_deal_high_pe_target():
    """
    Acquirer: $100M NI, 10M Shares ($10 EPS). Assuming P/E = 10, Share Price = $100.
    Target: $20M NI, 5M Shares ($4 EPS). Assuming P/E = 20, Share Price = $80.
    Deal: 100% Stock, 20% Premium, $0 Synergies.
    
    Since target P/E > Acquirer P/E, 100% stock deal should be dilutive.
    """
    deal_input = DealInput(
        acq_net_income=100.0,
        acq_shares=10.0,
        acq_share_price=100.0,
        
        tgt_net_income=20.0,
        tgt_shares=5.0,
        tgt_share_price=80.0,
        
        offer_premium_pct=0.20,
        cash_pct=0.0,
        stock_pct=1.0,
        debt_pct=0.0,
        
        pre_tax_synergies=0.0,
        interest_rate_debt=0.0,
        tax_rate=0.25
    )
    
    model = AccretionDilutionModel(deal_data=deal_input)
    results = model.calculate()
    
    # Standalone EPS = 10.0
    # Purchase Price = 5 * 80 * 1.2 = 480
    # New Shares = 480 / 100 = 4.8
    # Pro Forma Shares = 10 + 4.8 = 14.8
    # Pro Forma NI = 100 + 20 = 120
    # Pro Forma EPS = 120 / 14.8 = 8.108
    # Accretion/Dilution Amount = 8.108 - 10 = -1.89
    
    assert results["Standalone EPS"] == 10.0
    assert results["Pro-Forma EPS"] < results["Standalone EPS"], "Deal should be dilutive."
    assert results["Accretion/Dilution Amount"] < 0
    assert results["Accretion/Dilution Percentage"] < 0

def test_accretive_deal_with_advanced_synergies():
    """
    Test 3-year phasing, new\_da, and cost_to_achieve on a simple accretive deal.
    """
    deal_input = DealInput(
        acq_net_income=100.0, acq_shares=10.0, acq_share_price=10.0,
        tgt_net_income=50.0, tgt_shares=5.0, tgt_share_price=10.0,
        offer_premium_pct=0.0, cash_pct=1.0, stock_pct=0.0, debt_pct=0.0,
        pre_tax_synergies=20.0, cost_to_achieve=10.0, new_da=5.0,
        cost_of_cash=0.0, interest_rate_debt=0.0, tax_rate=0.0 # 0% tax for easy math
    )
    model = AccretionDilutionModel(deal_data=deal_input)
    results = model.calculate()
    
    # Standalone EPS = 10
    # Combined NI Base = 150
    # Purchase Price = 50, Cash Funded = 50. Foregone Interest = 0.
    # Base adjustments = - new_da (5) = -5
    
    # Y1 (25% syn): pf_ni = 150 + 5 (syn) - 5 (da) - 10 (cta) = 140. eps = 140/10 = 14
    # Y2 (75% syn): pf_ni = 150 + 15 (syn) - 5 (da) - 0 (cta) = 160. eps = 160/10 = 16
    # Y3 (100% syn): pf_ni = 150 + 20 (syn) - 5 (da) - 0 (cta) = 165. eps = 165/10 = 16.5
    
    phasing = results["synergy_phasing"]
    assert phasing[0]["pro_forma_eps"] == 14.0
    assert phasing[1]["pro_forma_eps"] == 16.0
    assert phasing[2]["pro_forma_eps"] == 16.5
    
    assert results["Pro-Forma EPS"] == 16.5

