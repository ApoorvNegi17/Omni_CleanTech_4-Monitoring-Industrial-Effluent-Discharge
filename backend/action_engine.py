def get_recommended_actions(risk_level: str) -> list[str]:
    level = risk_level.upper()
    
    if level == "LOW":
        return [
            "Continue monitoring"
        ]
    elif level == "MEDIUM":
        return [
            "Verify sensor readings",
            "Continue monitoring the affected point"
        ]
    elif level == "HIGH":
        return [
            "Verify sensor readings",
            "Inspect discharge point",
            "Monitor downstream points",
            "Notify responsible authority"
        ]
    elif level == "CRITICAL":
        return [
            "Verify sensor readings immediately",
            "Inspect discharge point",
            "Notify responsible authority",
            "Monitor downstream points",
            "Generate incident report"
        ]
    else:
        return ["Investigate readings"]
