from fastapi import APIRouter
from app.schemas.dcf import DCFInput, DCFResponse
from app.core.dcf_logic import DCFModel

router = APIRouter()

@router.post("/calculate", response_model=DCFResponse)
def calculate_dcf(payload: DCFInput):
    model = DCFModel(dcf_data=payload)
    return model.execute()
