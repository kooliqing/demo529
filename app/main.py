from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api import backtest, funds
from app.errors import AppError, error_body

app = FastAPI(title="基金定投回测 API", version="1.0.0")
app.include_router(funds.router)
app.include_router(backtest.router)


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content=error_body(exc.code, exc.message))


@app.get("/health")
def health():
    return {"status": "ok"}
