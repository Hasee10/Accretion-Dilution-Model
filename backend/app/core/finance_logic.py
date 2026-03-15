from typing import Dict, Any, List
from .base_model import FinancialModule
from ..schemas.deal import DealInput
import numpy as np

class AccretionDilutionModel(FinancialModule):
    deal_data: DealInput

    def validate_inputs(self) -> bool:
        return True

    def calculate_purchase_price(self, premium_pct: float = None) -> float:
        """Calculate total equity value of target plus premium."""
        premium = premium_pct if premium_pct is not None else self.deal_data.offer_premium_pct
        target_standalone_equity_value = self.deal_data.tgt_shares * self.deal_data.tgt_share_price
        purchase_price = target_standalone_equity_value * (1.0 + premium)
        return purchase_price

    def calculate_pro_forma_eps(self) -> Dict[str, Any]:
        """Core computations for Accretion/Dilution with Advanced Phasing & Sensitivity."""
        
        # 1. Base Purchase Price and Funding
        purchase_price = self.calculate_purchase_price()
        
        cash_funding = purchase_price * self.deal_data.cash_pct
        stock_funding = purchase_price * self.deal_data.stock_pct
        debt_funding = purchase_price * self.deal_data.debt_pct
        
        tax_shield = (1.0 - self.deal_data.tax_rate)
        
        after_tax_interest_expense = (debt_funding * self.deal_data.interest_rate_debt) * tax_shield
        after_tax_foregone_interest = (cash_funding * self.deal_data.cost_of_cash) * tax_shield
        after_tax_new_da = self.deal_data.new_da * tax_shield
        after_tax_cost_to_achieve = self.deal_data.cost_to_achieve * tax_shield
        
        # 2. Shares outstanding
        new_shares_issued = stock_funding / self.deal_data.acq_share_price if self.deal_data.acq_share_price > 0 else 0
        pro_forma_shares = self.deal_data.acq_shares + new_shares_issued
        
        # 3. Phased Income Adjustments (Y1: 25%, Y2: 75%, Y3: 100%)
        combined_ni = self.deal_data.acq_net_income + self.deal_data.tgt_net_income
        base_adjustments = - after_tax_interest_expense - after_tax_foregone_interest - after_tax_new_da
        
        synergy_realization = [0.25, 0.75, 1.00]
        phased_eps = []
        
        for idx, pct in enumerate(synergy_realization):
            after_tax_synergies = (self.deal_data.pre_tax_synergies * pct) * tax_shield
            
            # Cost to achieve is a one-time hit in Year 1
            cta_hit = after_tax_cost_to_achieve if idx == 0 else 0
            
            pf_ni = combined_ni + after_tax_synergies + base_adjustments - cta_hit
            pf_eps = pf_ni / pro_forma_shares if pro_forma_shares > 0 else 0
            
            acq_standalone_eps = self.deal_data.acq_net_income / self.deal_data.acq_shares if self.deal_data.acq_shares > 0 else 0
            
            diff = pf_eps - acq_standalone_eps
            pct_diff = (pf_eps / acq_standalone_eps - 1.0) if acq_standalone_eps > 0 else 0
            
            phased_eps.append({
                "year": f"Year {idx+1}",
                "synergy_pct": pct,
                "pro_forma_eps": pf_eps,
                "accretion_amount": diff,
                "accretion_pct": pct_diff
            })
            
        # We'll use Year 3 (fully realized) as the "Main" pro-forma EPS for backwards compatibility and primary stat
        main_pf_eps = phased_eps[2]["pro_forma_eps"]
        main_acc_amount = phased_eps[2]["accretion_amount"]
        main_acc_pct = phased_eps[2]["accretion_pct"]
        acq_standalone_eps = self.deal_data.acq_net_income / self.deal_data.acq_shares if self.deal_data.acq_shares > 0 else 0
        
        # 4. Matrices Generation
        # A. Synergy (X) vs Premium (Y) Heat Map
        sensitivity_synergy_premium = []
        premium_variants = [-0.10, 0.0, 0.10, 0.20, 0.30, 0.40]
        synergy_variants = [0.0, 0.25, 0.50, 0.75, 1.0, 1.25] # Multipliers on base synergy, or perhaps just % realized? Let's do Realization %
        
        for prem in premium_variants:
            pp = self.calculate_purchase_price(premium_pct=self.deal_data.offer_premium_pct + prem)
            cf = pp * self.deal_data.cash_pct
            sf = pp * self.deal_data.stock_pct
            df = pp * self.deal_data.debt_pct
            ns_issued = sf / self.deal_data.acq_share_price if self.deal_data.acq_share_price > 0 else 0
            pf_shares_var = self.deal_data.acq_shares + ns_issued
            
            at_int_exp = (df * self.deal_data.interest_rate_debt) * tax_shield
            at_fg_int = (cf * self.deal_data.cost_of_cash) * tax_shield
            b_adj = - at_int_exp - at_fg_int - after_tax_new_da
            
            row = {"premium": self.deal_data.offer_premium_pct + prem}
            for syn_pct in synergy_variants:
                at_syn = (self.deal_data.pre_tax_synergies * syn_pct) * tax_shield
                pf_n = combined_ni + at_syn + b_adj # Ignoring Year 1 CTA for mature matrix
                pf_e = pf_n / pf_shares_var if pf_shares_var > 0 else 0
                acc_pc = (pf_e / acq_standalone_eps - 1.0) if acq_standalone_eps > 0 else 0
                row[f"syn_{syn_pct * 100:.0f}"] = acc_pc
            sensitivity_synergy_premium.append(row)
            
        # B. Purchase Price vs Cost of Debt Matrix
        sensitivity_price_debt = []
        debt_rates = [-0.02, -0.01, 0.0, 0.01, 0.02]
        price_variants = [-0.10, -0.05, 0.0, 0.05, 0.10]
        
        for base_p in price_variants:
            pp = purchase_price * (1.0 + base_p)
            cf = pp * self.deal_data.cash_pct
            sf = pp * self.deal_data.stock_pct
            df = pp * self.deal_data.debt_pct
            ns_issued = sf / self.deal_data.acq_share_price if self.deal_data.acq_share_price > 0 else 0
            pf_shares_var = self.deal_data.acq_shares + ns_issued
            
            at_fg_int = (cf * self.deal_data.cost_of_cash) * tax_shield
            
            row = {"price_change": base_p, "purchase_price": pp}
            for dr in debt_rates:
                eff_rate = max(0, self.deal_data.interest_rate_debt + dr)
                at_int_exp = (df * eff_rate) * tax_shield
                b_adj = - at_int_exp - at_fg_int - after_tax_new_da
                at_syn = self.deal_data.pre_tax_synergies * tax_shield
                pf_n = combined_ni + at_syn + b_adj
                pf_e = pf_n / pf_shares_var if pf_shares_var > 0 else 0
                acc_pc = (pf_e / acq_standalone_eps - 1.0) if acq_standalone_eps > 0 else 0
                row[f"rate_{dr * 100:.0f}"] = acc_pc
            sensitivity_price_debt.append(row)

        # 5. Ownership & Multiples
        acq_ownership_pct = self.deal_data.acq_shares / pro_forma_shares if pro_forma_shares > 0 else 0
        tgt_ownership_pct = new_shares_issued / pro_forma_shares if pro_forma_shares > 0 else 0

        # Breakeven Synergies (for Year 3)
        target_pro_forma_ni = acq_standalone_eps * pro_forma_shares
        ni_gap = target_pro_forma_ni - combined_ni - base_adjustments
        breakeven_synergies = ni_gap / tax_shield if tax_shield > 0 else 0
        
        # P/E Multiples
        acq_pe = self.deal_data.acq_share_price / acq_standalone_eps if acq_standalone_eps > 0 else 0
        tgt_standalone_eps = self.deal_data.tgt_net_income / self.deal_data.tgt_shares if self.deal_data.tgt_shares > 0 else 0
        tgt_pe = self.deal_data.tgt_share_price / tgt_standalone_eps if tgt_standalone_eps > 0 else 0
        
        # Effective Target P/E (Purchase Price / Target Net Income)
        effective_tgt_pe = purchase_price / self.deal_data.tgt_net_income if self.deal_data.tgt_net_income > 0 else 0

        return {
            "Standalone EPS": acq_standalone_eps,
            "Pro-Forma EPS": main_pf_eps,
            "Accretion/Dilution Amount": main_acc_amount,
            "Accretion/Dilution Percentage": main_acc_pct,
            "Acquirer Ownership %": acq_ownership_pct,
            "Target Ownership %": tgt_ownership_pct,
            "Breakeven Synergies": breakeven_synergies,
            "synergy_phasing": phased_eps,
            "sensitivity_synergy_premium": sensitivity_synergy_premium,
            "sensitivity_price_debt": sensitivity_price_debt,
            "acq_pe": acq_pe,
            "tgt_pe": tgt_pe,
            "effective_tgt_pe": effective_tgt_pe
        }

    def calculate(self) -> Dict[str, Any]:
        return self.calculate_pro_forma_eps()
