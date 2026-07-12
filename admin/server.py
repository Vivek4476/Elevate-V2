"""
FastAPI Admin & Publishing service (migration Step 8) — a thin wrapper over admin/flow.py.

Layer-1 (Python) owns validate + reconcile + publish, reusing the pipeline. The frontend Manager
console calls these endpoints.

Run:  ./pipeline/.venv/bin/python -m uvicorn admin.server:app --port 8099
      (or ./pipeline/.venv/bin/python admin/server.py)
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import flow  # noqa: E402

app = FastAPI(title="Elevate · Admin & Publishing")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

TEMPLATES = {"incentive": "Incentive_Import_Template.xlsx", "sp": "SP_Import_Template.xlsx"}


@app.get("/admin/health")
def health():
    return flow.health()


@app.get("/admin/templates/{which}")
def template(which: str):
    if which not in TEMPLATES:
        raise HTTPException(404, "unknown template")
    out = flow.DATA / "out"
    f = out / TEMPLATES[which]
    if not f.exists():
        from pipeline.templates.build_templates import build_all
        build_all(flow._plan(), out, flow.PIPE / "data/Incentive_Sheet_Apr.xlsx",
                  flow.PIPE / "data/Final_SP_Summary_Apr_26_Field.xlsb")
    if not f.exists():
        raise HTTPException(404, "template not available")
    return FileResponse(f, filename=TEMPLATES[which])


@app.post("/admin/upload")
async def upload(incentive: UploadFile = File(...), sp: UploadFile = File(...)):
    with tempfile.TemporaryDirectory() as td:
        ip, spp = Path(td) / "i.xlsx", Path(td) / "s.xlsb"
        ip.write_bytes(await incentive.read())
        spp.write_bytes(await sp.read())
        return flow.save_upload(ip, spp)


@app.post("/admin/validate")
def validate():
    try:
        return flow.validate()
    except flow.FlowError as e:
        raise HTTPException(400, str(e))


@app.post("/admin/preview")
def preview():
    try:
        return flow.preview()
    except flow.FlowError as e:
        raise HTTPException(400, str(e))


@app.post("/admin/publish")
def publish():
    try:
        return flow.publish()
    except flow.FlowError as e:
        raise HTTPException(409, str(e))     # 409: reconcile/validation not green


@app.get("/admin/audit")
def audit():
    return flow.audit()


@app.post("/admin/rollback/{publish_id}")
def rollback(publish_id: str):
    try:
        return flow.rollback(publish_id)
    except flow.FlowError as e:
        raise HTTPException(404, str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8099)
