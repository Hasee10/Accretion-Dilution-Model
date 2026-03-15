from typing import Any, Dict
from app.core.base_model import FinancialModule
from app.schemas.lbo import LBOInput


class LBOModel(FinancialModule):
    lbo_data: LBOInput

    def validate_inputs(self) -> bool:
        return self.lbo_data.entry_ev > 0 and self.lbo_data.entry_ebitda > 0 and self.lbo_data.hold_period > 0

    def execute(self) -> Dict[str, Any]:
        return self.calculate()

    def calculate(self) -> Dict[str, Any]:
        entry_ev = self.lbo_data.entry_ev
        entry_ebitda = self.lbo_data.entry_ebitda
        exit_multiple = self.lbo_data.exit_multiple
        hold_period = self.lbo_data.hold_period
        debt_pct = self.lbo_data.debt_pct
        interest_rate = self.lbo_data.interest_rate
        ebitda_growth_rate = self.lbo_data.ebitda_growth_rate
        management_fee_pct = self.lbo_data.management_fee_pct

        entry_equity = entry_ev * (1 - debt_pct)
        entry_debt = entry_ev * debt_pct
        entry_multiple = entry_ev / entry_ebitda if entry_ebitda > 0 else 0

        exit_ebitda = entry_ebitda * ((1 + ebitda_growth_rate) ** hold_period)
        exit_ev = exit_ebitda * exit_multiple

        annual_debt_paydown = entry_ebitda * 0.10
        remaining_debt = max(0, entry_debt - (annual_debt_paydown * hold_period))

        avg_debt = (entry_debt + remaining_debt) / 2
        total_interest = avg_debt * interest_rate * hold_period

        exit_equity = exit_ev - remaining_debt

        moic = exit_equity / entry_equity if entry_equity > 0 else 0
        irr = ((exit_equity / entry_equity) ** (1 / hold_period)) - 1 if entry_equity > 0 and exit_equity > 0 else -1

        annual_fee = entry_equity * management_fee_pct
        fee_drag_on_irr = ((annual_fee * hold_period) / entry_equity / hold_period) if entry_equity > 0 else 0

        sensitivity: Dict[int, Dict[float, float]] = {}
        for hp in [3, 4, 5, 6, 7]:
            sensitivity[hp] = {}
            sensitivity_exit_ebitda = entry_ebitda * ((1 + ebitda_growth_rate) ** hp)
            sensitivity_remaining_debt = max(0, entry_debt - (annual_debt_paydown * hp))
            for em in [exit_multiple - 2, exit_multiple - 1, exit_multiple, exit_multiple + 1, exit_multiple + 2]:
                s_exit_ev = sensitivity_exit_ebitda * em
                s_exit_equity = s_exit_ev - sensitivity_remaining_debt
                s_moic = s_exit_equity / entry_equity if entry_equity > 0 else 0
                s_irr = (s_moic ** (1 / hp)) - 1 if s_moic > 0 else -1
                sensitivity[hp][round(em, 1)] = round(s_irr * 100, 1)

        irr_bridge = {
            "ebitda_growth": round(max(0, (exit_ebitda - entry_ebitda) * entry_multiple / entry_equity * 100), 1) if entry_equity > 0 else 0,
            "multiple_expansion": round(((exit_multiple - entry_multiple) * exit_ebitda / entry_equity) * 100, 1) if entry_equity > 0 else 0,
            "debt_paydown": round(((entry_debt - remaining_debt) / entry_equity) * 100, 1) if entry_equity > 0 else 0,
            "management_fee_drag": round(-(fee_drag_on_irr * 100), 1),
        }

        return {
            "entry_multiple": round(entry_multiple, 1),
            "entry_equity": round(entry_equity, 1),
            "entry_debt": round(entry_debt, 1),
            "exit_ebitda": round(exit_ebitda, 1),
            "exit_ev": round(exit_ev, 1),
            "exit_equity": round(exit_equity, 1),
            "remaining_debt": round(remaining_debt, 1),
            "annual_debt_paydown": round(annual_debt_paydown, 1),
            "total_interest": round(total_interest, 1),
            "annual_fee": round(annual_fee, 1),
            "moic": round(moic, 2),
            "irr": round(irr * 100, 1),
            "fee_drag_on_irr": round(fee_drag_on_irr * 100, 1),
            "sensitivity": sensitivity,
            "irr_bridge": irr_bridge,
        }
