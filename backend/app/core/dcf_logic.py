from app.schemas.dcf import DCFInput, DCFResponse

class DCFModel:
    def __init__(self, dcf_data: DCFInput):
        self.data = dcf_data
        
    def execute(self) -> DCFResponse:
        # 1. Project Free Cash Flows (5 Years)
        years = [1, 2, 3, 4, 5]
        revs = []
        ebitdas = []
        fcfs = []
        pv_fcfs = []
        
        current_rev = self.data.revenue_base
        for y in years:
            # Grow revenue
            current_rev = current_rev * (1 + self.data.revenue_growth)
            revs.append(current_rev)
            
            # EBITDA
            ebitda = current_rev * self.data.ebitda_margins
            ebitdas.append(ebitda)
            
            # Simplified FCF: EBITDA * (1 - Tax Rate)
            # Assuming D&A offsets Capex entirely, and NWC changes are 0 for this exact scoped phase.
            fcf = ebitda * (1 - self.data.tax_rate)
            fcfs.append(fcf)
            
            # Discount FCF to Present Value
            pv_fcf = fcf / ((1 + self.data.wacc) ** y)
            pv_fcfs.append(pv_fcf)
            
        sum_pv_fcf = sum(pv_fcfs)
        
        # 2. Terminal Value (PGM - Perpetuity Growth Method)
        year_5_fcf = fcfs[-1]
        tv_pgm = (year_5_fcf * (1 + self.data.terminal_growth_rate)) / (self.data.wacc - self.data.terminal_growth_rate)
        pv_tv_pgm = tv_pgm / ((1 + self.data.wacc) ** 5)
        
        ev_pgm = sum_pv_fcf + pv_tv_pgm
        eq_pgm = ev_pgm + self.data.cash - self.data.total_debt
        price_pgm = eq_pgm / self.data.shares_outstanding if self.data.shares_outstanding > 0 else 0
        
        # 3. Terminal Value (EMM - Exit Multiple Method)
        year_5_ebitda = ebitdas[-1]
        tv_emm = year_5_ebitda * self.data.exit_multiple
        pv_tv_emm = tv_emm / ((1 + self.data.wacc) ** 5)
        
        ev_emm = sum_pv_fcf + pv_tv_emm
        eq_emm = ev_emm + self.data.cash - self.data.total_debt
        price_emm = eq_emm / self.data.shares_outstanding if self.data.shares_outstanding > 0 else 0
        
        # 4. Generate Sensitivity Matrices
        matrix_wacc_tgr = self._generate_matrix_pgm(fcfs[-1], sum_pv_fcf)
        matrix_wacc_emm = self._generate_matrix_emm(ebitdas[-1], sum_pv_fcf)
        
        # 5. Return formatted response
        return DCFResponse(
            status="ok",
            projected_years=years,
            projected_revenues=revs,
            projected_ebitda=ebitdas,
            projected_fcf=fcfs,
            pv_of_fcf=pv_fcfs,
            sum_pv_fcf=sum_pv_fcf,
            
            terminal_value_pgm=tv_pgm,
            pv_tv_pgm=pv_tv_pgm,
            enterprise_value_pgm=ev_pgm,
            equity_value_pgm=eq_pgm,
            share_price_pgm=price_pgm,
            
            terminal_value_emm=tv_emm,
            pv_tv_emm=pv_tv_emm,
            enterprise_value_emm=ev_emm,
            equity_value_emm=eq_emm,
            share_price_emm=price_emm,
            
            sensitivity_wacc_tgr=matrix_wacc_tgr,
            sensitivity_wacc_emm=matrix_wacc_emm
        )

    def _generate_matrix_pgm(self, year_5_fcf: float, sum_pv_fcf: float) -> list[dict]:
        wacc_steps = [self.data.wacc - 0.02, self.data.wacc - 0.01, self.data.wacc, self.data.wacc + 0.01, self.data.wacc + 0.02]
        tgr_steps = [self.data.terminal_growth_rate - 0.01, self.data.terminal_growth_rate - 0.005, self.data.terminal_growth_rate, self.data.terminal_growth_rate + 0.005, self.data.terminal_growth_rate + 0.01]
        
        matrix = []
        for w in wacc_steps:
            row = {"wacc": w}
            for tgr in tgr_steps:
                if w <= tgr:
                    row[str(tgr)] = 0
                    continue
                tv = (year_5_fcf * (1 + tgr)) / (w - tgr)
                pv_tv = tv / ((1 + w) ** 5)
                ev = sum_pv_fcf + pv_tv
                eq = ev + self.data.cash - self.data.total_debt
                price = eq / self.data.shares_outstanding if self.data.shares_outstanding > 0 else 0
                row[str(tgr)] = price
            matrix.append(row)
        return matrix

    def _generate_matrix_emm(self, year_5_ebitda: float, sum_pv_fcf: float) -> list[dict]:
        wacc_steps = [self.data.wacc - 0.02, self.data.wacc - 0.01, self.data.wacc, self.data.wacc + 0.01, self.data.wacc + 0.02]
        mult_steps = [self.data.exit_multiple - 2.0, self.data.exit_multiple - 1.0, self.data.exit_multiple, self.data.exit_multiple + 1.0, self.data.exit_multiple + 2.0]
        
        matrix = []
        for w in wacc_steps:
            row = {"wacc": w}
            for mult in mult_steps:
                tv = year_5_ebitda * mult
                pv_tv = tv / ((1 + w) ** 5)
                ev = sum_pv_fcf + pv_tv
                eq = ev + self.data.cash - self.data.total_debt
                price = eq / self.data.shares_outstanding if self.data.shares_outstanding > 0 else 0
                row[str(mult)] = price
            matrix.append(row)
        return matrix
