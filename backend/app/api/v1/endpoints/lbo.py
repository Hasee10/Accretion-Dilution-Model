from fastapi import APIRouter
from app.schemas.lbo import LBOInput, LBOResponse
from app.core.lbo_logic import LBOModel

router = APIRouter()


@router.post("/calculate", response_model=LBOResponse)
def calculate_lbo(payload: LBOInput):
    model = LBOModel(lbo_data=payload)
    result = model.execute() if hasattr(model, "execute") else model.calculate()
    return {"status": "ok", **result}
