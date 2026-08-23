def calculate_risk(ph: float, turbidity: float, temperature: float, tds: float, flow_rate: float):
    score = 10
    reasons = []
    abnormal_params = 0

    # pH
    if ph < 6.0 or ph > 9.0:
        score += 25
        reasons.append("Severe pH deviation")
        abnormal_params += 1
    elif ph < 6.5 or ph > 8.5:
        score += 10
        reasons.append("Moderate pH deviation")
        abnormal_params += 1

    # Turbidity
    if turbidity > 100:
        score += 30
        reasons.append("Critical turbidity level")
        abnormal_params += 1
    elif turbidity > 50:
        score += 15
        reasons.append("High turbidity")
        abnormal_params += 1

    # Temperature
    if temperature > 45 or temperature < 10:
        score += 20
        reasons.append("Extreme temperature")
        abnormal_params += 1
    elif temperature > 40 or temperature < 15:
        score += 10
        reasons.append("High temperature")
        abnormal_params += 1

    # TDS
    if tds > 1200:
        score += 25
        reasons.append("Critical TDS level")
        abnormal_params += 1
    elif tds > 800:
        score += 15
        reasons.append("Elevated TDS/conductivity")
        abnormal_params += 1

    # Flow Rate
    if flow_rate > 200:
        score += 20
        reasons.append("Severe flow anomaly (spill)")
        abnormal_params += 1
    elif flow_rate < 10:
        score += 10
        reasons.append("Low flow anomaly (blockage)")
        abnormal_params += 1
    elif flow_rate > 150 or flow_rate < 20:
        score += 5
        abnormal_params += 1

    # Multiplier for compounding issues
    if abnormal_params >= 3:
        score += 20
        reasons.append("Multiple cascading parameter deviations")
    
    score = min(score, 100)

    # Determine risk level
    if score < 30:
        level = "LOW"
    elif score < 60:
        level = "MEDIUM"
    elif score < 80:
        level = "HIGH"
    else:
        level = "CRITICAL"

    if not reasons and level == "LOW":
        reasons.append("All parameters within normal limits")

    return {
        "risk_score": score,
        "risk_level": level,
        "reasons": reasons
    }
