"""routes_simulation.py — REST API endpoints for simulation control."""

from fastapi import APIRouter, HTTPException
from app.database.schemas import SimulationStartRequest, WhatIfRequest
from app.simulation.simulator import simulator, _simulation_running
from app.simulation.what_if import run_what_if
from app.digital_twin.twin import digital_twin

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])


@router.post("/start", summary="Start or switch simulation scenario")
def start_simulation(req: SimulationStartRequest):
    """
    Set the active simulation scenario.
    Scenarios: normal / temp_drop / gas_degradation / sudden_spike / recovery
    """
    try:
        simulator.set_scenario(req.scenario)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {
        "status": "ok",
        "scenario": req.scenario,
        "message": f"Simulation scenario set to '{req.scenario}'. Data will update every cycle.",
        "available_scenarios": simulator.SCENARIOS,
    }


@router.get("/status", summary="Get simulation status")
def get_simulation_status():
    return {
        "simulation_running": _simulation_running,
        "current_scenario": simulator.scenario,
        "step": simulator.step,
        "available_scenarios": simulator.SCENARIOS,
        "data_source": "SIMULATION",
    }


@router.post("/what-if", summary="Run a What-If simulation")
def what_if_simulation(req: WhatIfRequest):
    """
    Run a What-If scenario on the Digital Twin.
    This does NOT affect the physical system — only the virtual model.
    """
    current = digital_twin.to_dict()
    result = run_what_if(
        temperature=req.temperature,
        humidity=req.humidity,
        mq5_override=req.mq5_override,
        mq2_override=req.mq2_override,
        duration_hours=req.duration_hours,
        current_state=current,
    )
    return result
