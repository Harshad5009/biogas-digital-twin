"""
remediation.py — Explainable AI (XAI) Decision Support & Remediation Engine.

Provides transparent root-cause analysis and prescriptive, step-by-step
action plans for farmers and plant managers when anomalies or process
deviations occur in the anaerobic digester.
"""

from typing import Dict, Any, List, Optional

REMEDIATION_KNOWLEDGE_BASE = {
    "temperature_low": {
        "title": "Low Temperature / Thermal Inversion (< 20°C)",
        "category": "Thermal & Kinetics",
        "urgency": "HIGH (Action within 6–12 Hours)",
        "root_cause": (
            "Ambient cold front, digester insulation failure, or unheated slurry feed. "
            "Methanogenic archaea slow metabolic kinetics by ~50% for every 5°C drop below 32°C. "
            "Acid-forming bacteria outpace methanogens, leading to Volatile Fatty Acid (VFA) accumulation "
            "and severe digester souring."
        ),
        "farmer_actions": [
            "Check auxiliary heating element / solar heating loop circulation pump and thermostat.",
            "Reduce or pause fresh unheated slurry feeding by 30–50% to prevent thermal shock to the microbial bed.",
            "Inspect and secure external insulation jackets, thermal blankets, or greenhouse glazing covering the dome.",
            "If cold water was added during slurry dilution, use pre-warmed water (approx 35°C) for the next feeding batch.",
            "Monitor effluent pH: ensure it stays above 6.8 to prevent irreversible acidification."
        ],
        "recovery_target": "Digester core temperature restored to 30.0°C – 35.0°C (mesophilic range); gas production stabilizes > 1.5 L/min.",
    },
    "temperature_high": {
        "title": "High Temperature / Overheating (> 40°C)",
        "category": "Thermal & Kinetics",
        "urgency": "IMMEDIATE (Risk of Microbial Die-Off)",
        "root_cause": (
            "Direct intense summer solar radiation or heating thermostat failure. "
            "Mesophilic methanogens experience cellular membrane denaturation and thermal death above 42°C."
        ),
        "farmer_actions": [
            "Immediately disconnect or shut off electric/solar auxiliary heaters.",
            "Deploy reflective shade netting or thatch mats over the digester dome to block solar radiation.",
            "Introduce ambient-temperature water or cool diluted feedstock in small increments to bring core temperature below 37°C.",
            "Ensure pressure relief bubbler has sufficient water and vents freely."
        ],
        "recovery_target": "Temperature returns below 36.0°C; microbial activity resumes without odor spikes.",
    },
    "temperature_spike": {
        "title": "Sudden Temperature Shift (Δ > 5°C)",
        "category": "Thermal Shock",
        "urgency": "HIGH",
        "root_cause": (
            "Rapid ambient swing, faulty thermal probe, or sudden dumping of hot/cold wastewater into inlet tank. "
            "Rapid shifts destabilize the microbial community faster than steady gradual declines."
        ),
        "farmer_actions": [
            "Check the inlet feeding tank temperature before introducing new substrate batches.",
            "Inspect the DHT11 sensor probe wiring and physical placement inside the sensor well.",
            "Allow newly mixed feedstock to equilibrate to ambient temperature before pumping into digester."
        ],
        "recovery_target": "Thermal fluctuation stabilizes within ± 1.0°C per hour.",
    },
    "gas_low": {
        "title": "Critical Gas Production Collapse / Digester Acidosis",
        "category": "Biochemical Process Failure",
        "urgency": "HIGH (Action within 24 Hours)",
        "root_cause": (
            "Organic overfeeding, toxic shock (detergents/antibiotics in feedstock), or digester souring (pH < 6.5). "
            "Hydrolysis and acidogenesis outpace methanogenesis, creating a toxic VFA bottleneck that shuts down methane yield."
        ),
        "farmer_actions": [
            "Stop feeding fresh organic waste or high-sugar substrates immediately for 48–72 hours.",
            "Add a buffering agent: mix agricultural lime (calcium hydroxide) or sodium bicarbonate (1–2 kg per 1000L) with water and introduce via inlet.",
            "Introduce 2–3 buckets of fresh active cattle dung slurry from a healthy digester to re-inoculate methanogens.",
            "Test slurry effluent with pH paper: target 6.8 to 7.4 before resuming feeding.",
            "When resuming, feed at 25% normal volume and gradually ramp up over 5 days."
        ],
        "recovery_target": "Biogas production returns > 1.8 L/min and methane content climbs above 55%.",
    },
    "gas_spike": {
        "title": "Flammable Gas Surge / Hazard (MQ-2 Alert or MQ-5 Surge)",
        "category": "Gas Leak & Safety Hazard",
        "urgency": "CRITICAL EMERGENCY (Immediate Safety Action)",
        "root_cause": (
            "Downstream valve closed while production continues, pressure regulator blocked, "
            "gas pipe rupture, or flammable gas accumulation in the plant housing."
        ),
        "farmer_actions": [
            "SAFETY FIRST: Open all doors and ventilation vents in the digester shed. Extinguish open flames and do NOT toggle electrical light switches (spark hazard).",
            "Check the overpressure water-column safety bubbler to confirm it is releasing excess pressure safely.",
            "Inspect the main gas delivery ball valve between digester and storage balloon/appliances.",
            "Perform a soapy-water bubble test along pipeline joints, valves, and moisture separator to locate gas leaks.",
            "If pressure is dangerously high, gently vent gas to a safe outdoor height or light the auxiliary flare burner."
        ],
        "recovery_target": "MQ-2 returns to NORMAL (0), MQ-5 index drops < 450 ADC, line pressure normalizes.",
    },
    "humidity_abnormal": {
        "title": "Abnormal Digester Humidity (< 30% or > 95%)",
        "category": "Moisture & Condensation",
        "urgency": "MEDIUM (Action within 48 Hours)",
        "root_cause": (
            "Biogas is 100% water-saturated. If sensor humidity is extreme, either the moisture condensation trap "
            "is overflowing, biogas piping has condensate pooling, or rainwater has penetrated the dome seal."
        ),
        "farmer_actions": [
            "Drain the condensation trap (water drain bottle) at the lowest point of the biogas delivery pipe.",
            "Inspect the gas collection line for pipe sagging where water can pool and cause gas flow chattering.",
            "Check the DHT11 sensor enclosure to ensure condensation droplets are not directly bridging sensor pins.",
            "Verify dome water seal or hydraulic slurry overflow level."
        ],
        "recovery_target": "Humidity stabilizes between 55% and 80%; smooth gas flow without line bubbling.",
    },
    "normal": {
        "title": "Optimal Steady-State Operation",
        "category": "Normal Production",
        "urgency": "ROUTINE",
        "root_cause": (
            "The anaerobic microbial ecosystem is in balanced equilibrium. "
            "Acidogens and methanogens are operating at synchronized kinetics under mesophilic conditions."
        ),
        "farmer_actions": [
            "Maintain consistent daily feeding schedule (regular volume at fixed time of day).",
            "Maintain optimal substrate dilution ratio (typically 1:1 fresh cow dung to water).",
            "Record daily gas production and verify digestate slurry overflows cleanly into effluent compost pit."
        ],
        "recovery_target": "All parameters within optimal operating bands.",
    }
}


def diagnose_and_prescribe(
    anomaly_detected: bool,
    reasons: Optional[List[str]] = None,
    temperature: Optional[float] = None,
    humidity: Optional[float] = None,
    mq5: Optional[float] = None,
    mq2: Optional[float] = None,
    gas_production: Optional[float] = None,
    status: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Synthesize sensor parameters and anomaly reasons into an Explainable AI
    diagnosis with prescriptive remediation steps for plant operators.
    """
    reasons = reasons or []
    reasons_text = " ".join(reasons).lower()

    matched_keys: List[str] = []

    # Priority 1: Flammable gas hazard (MQ-2 or massive MQ-5)
    if (mq2 is not None and mq2 >= 1.0) or (mq5 is not None and mq5 > 750) or "mq-2" in reasons_text or "mq-5" in reasons_text:
        matched_keys.append("gas_spike")

    # Priority 2: Thermal deviations
    if (temperature is not None and temperature < 20.0) or "temperature too low" in reasons_text or "temperature decline" in reasons_text:
        matched_keys.append("temperature_low")
    elif (temperature is not None and temperature > 40.0) or "temperature too high" in reasons_text:
        matched_keys.append("temperature_high")
    elif "temperature change" in reasons_text:
        matched_keys.append("temperature_spike")

    # Priority 3: Gas production collapse
    if (gas_production is not None and gas_production < 0.35) or "gas production" in reasons_text:
        matched_keys.append("gas_low")

    # Priority 4: Humidity
    if (humidity is not None and (humidity < 30.0 or humidity > 95.0)) or "humidity" in reasons_text:
        matched_keys.append("humidity_abnormal")

    if not matched_keys or not anomaly_detected:
        if status in ["WARNING", "DEGRADING"] and not matched_keys:
            matched_keys.append("gas_low")
        else:
            matched_keys = ["normal"]

    # Select primary diagnosis
    primary_key = matched_keys[0]
    primary_info = REMEDIATION_KNOWLEDGE_BASE.get(primary_key, REMEDIATION_KNOWLEDGE_BASE["normal"])

    # Collect secondary recommendations if multiple anomalies co-occur
    secondary_diagnoses = [
        REMEDIATION_KNOWLEDGE_BASE[k]
        for k in matched_keys[1:]
        if k in REMEDIATION_KNOWLEDGE_BASE
    ]

    return {
        "status": status or ("ANOMALY" if anomaly_detected else "HEALTHY"),
        "is_anomaly": anomaly_detected,
        "primary_diagnosis": primary_info,
        "secondary_diagnoses": secondary_diagnoses,
        "all_scenarios": REMEDIATION_KNOWLEDGE_BASE,
    }
