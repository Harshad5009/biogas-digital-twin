"""routes_simulation.py — REST API endpoints for simulation control."""

from fastapi import APIRouter, HTTPException
from app.database.schemas import SimulationStartRequest, WhatIfRequest
from app.simulation.simulator import simulator, _simulation_running
from app.simulation.what_if import run_what_if
from app.digital_twin.twin import digital_twin

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])


@router.post("/start", summary="Start or switch simulation scenario")
async def start_simulation_endpoint(req: SimulationStartRequest):
    """
    Set active simulation scenario and explicitly switch mode to SIMULATION.
    Starts background simulation runner if not already active.
    """
    try:
        simulator.set_scenario(req.scenario)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    digital_twin.set_mode("SIMULATION")

    from app.simulation.simulator import is_simulation_running, start_simulation
    from app.config import settings

    if not is_simulation_running():
        from app.main import process_sensor_data
        start_simulation(
            interval_sec=settings.SIMULATION_INTERVAL_SECONDS,
            data_callback=process_sensor_data,
        )

    try:
        from app.main import ws_manager
        await ws_manager.broadcast({
            "type": "update",
            "twin_state": digital_twin.to_dict(),
            "mode": "SIMULATION",
        })
    except Exception:
        pass

    return {
        "status": "ok",
        "scenario": req.scenario,
        "mode": "SIMULATION",
        "simulation_running": True,
        "message": f"Simulation scenario set to '{req.scenario}'. Explicit simulation mode active.",
        "available_scenarios": simulator.SCENARIOS,
    }


@router.post("/stop", summary="Stop simulation and return to LIVE hardware mode")
async def stop_simulation_endpoint():
    """
    Stop the background simulation runner and return Digital Twin to LIVE hardware mode.
    Restores the latest physical hardware reading if available.
    """
    from app.simulation.simulator import stop_simulation
    stop_simulation()
    digital_twin.set_mode("LIVE")

    try:
        from app.main import ws_manager
        await ws_manager.broadcast({
            "type": "update",
            "twin_state": digital_twin.to_dict(),
            "mode": "LIVE",
        })
    except Exception:
        pass

    return {
        "status": "ok",
        "message": "Simulation stopped. Returned to LIVE hardware mode.",
        "mode": "LIVE",
        "simulation_running": False,
    }


@router.get("/status", summary="Get simulation status")
def get_simulation_status():
    from app.simulation.simulator import is_simulation_running
    return {
        "simulation_running": is_simulation_running(),
        "mode": digital_twin.mode,
        "current_scenario": simulator.scenario,
        "step": simulator.step,
        "available_scenarios": simulator.SCENARIOS,
        "data_source": digital_twin.get_effective_data_source(),
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
