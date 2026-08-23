def detect_anomaly(current_reading: dict, history_readings: list):
    """
    history_readings is a list of recent dictionaries (e.g. last 10 readings).
    """
    if not history_readings:
        return {
            "is_anomaly": False,
            "confidence": 0.0,
            "type": "Not enough history",
            "affected_parameters": []
        }

    affected_parameters = []
    
    # Calculate simple moving averages
    def get_avg(param):
        return sum(r.get(param, 0) for r in history_readings) / len(history_readings)

    avg_turbidity = get_avg('turbidity')
    avg_tds = get_avg('tds')
    avg_ph = get_avg('ph')
    avg_flow = get_avg('flow_rate')

    # Sudden change detection (e.g., jump of more than 50% for turbidity/TDS)
    cur_turbidity = current_reading.get('turbidity', 0)
    cur_tds = current_reading.get('tds', 0)
    cur_ph = current_reading.get('ph', 7.0)
    cur_flow = current_reading.get('flow_rate', 0)

    if avg_turbidity > 0 and cur_turbidity > (avg_turbidity * 1.5) and cur_turbidity > 30:
        affected_parameters.append("turbidity")
        
    if avg_tds > 0 and cur_tds > (avg_tds * 1.3) and cur_tds > 600:
        affected_parameters.append("tds")
        
    if abs(cur_ph - avg_ph) > 1.0:
        affected_parameters.append("ph")
        
    if avg_flow > 0 and (cur_flow > avg_flow * 1.4 or cur_flow < avg_flow * 0.6) and cur_flow > 40:
        affected_parameters.append("flow_rate")

    is_anomaly = len(affected_parameters) > 0

    if is_anomaly:
        confidence = min(0.60 + (len(affected_parameters) * 0.15), 0.98)
        anomaly_type = " + ".join(affected_parameters) + " deviation"
    else:
        confidence = 0.95
        anomaly_type = "No significant deviation detected"
        
    return {
        "is_anomaly": is_anomaly,
        "confidence": round(confidence, 2),
        "type": anomaly_type.capitalize(),
        "affected_parameters": affected_parameters
    }
