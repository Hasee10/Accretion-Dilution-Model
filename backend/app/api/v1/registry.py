from typing import Dict, Type
from app.core.base_model import FinancialModule

class ModuleRegistry:
    def __init__(self):
        self._modules: Dict[str, Type[FinancialModule]] = {}

    def register(self, name: str, module_cls: Type[FinancialModule]):
        self._modules[name] = module_cls

    def get_module(self, name: str) -> Type[FinancialModule]:
        if name not in self._modules:
            raise ValueError(f"Module {name} not found in registry.")
        return self._modules[name]

    def list_modules(self) -> Dict[str, str]:
        return {k: v.__name__ for k, v in self._modules.items()}

registry = ModuleRegistry()
