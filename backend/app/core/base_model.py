from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Any, Dict

class FinancialModule(ABC, BaseModel):
    """
    Abstract Base Class for all financial modules (DCF, LBO, etc.).
    Enforces a strict interface for mathematical calculations.
    """
    
    @abstractmethod
    def calculate(self) -> Dict[str, Any]:
        """Execute core financial math logic."""
        pass
        
    @abstractmethod
    def validate_inputs(self) -> bool:
        """Validate input parameters before calculation."""
        pass
