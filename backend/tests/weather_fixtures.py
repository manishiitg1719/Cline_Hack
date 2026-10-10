"""Fake Open-Meteo responses for tests (no network)."""


def make_raw(soil=0.20, rain_prob=10, rain_mm=0.0, t_max=33.0, wind=12.0, et0=5.0, humidity=95, t_hour=18.0):
    dates = [f"2026-10-{10 + i:02d}" for i in range(7)]
    hours = [f"{d}T{h:02d}:00" for d in dates for h in range(24)]
    n = len(hours)
    return {
        "timezone": "Asia/Kolkata",
        "current": {"time": "2026-10-10T14:45", "temperature_2m": 32.0, "relative_humidity_2m": 40,
                    "wind_speed_10m": 8.0, "weather_code": 0, "precipitation": 0.0},
        "daily": {"time": dates, "weather_code": [0] * 7, "temperature_2m_max": [t_max] * 7,
                  "temperature_2m_min": [20.0] * 7, "precipitation_sum": [rain_mm] * 7,
                  "precipitation_probability_max": [rain_prob] * 7, "wind_speed_10m_max": [wind] * 7,
                  "et0_fao_evapotranspiration": [et0] * 7},
        "hourly": {"time": hours, "relative_humidity_2m": [humidity] * n, "temperature_2m": [t_hour] * n,
                   "precipitation_probability": [rain_prob] * n, "soil_moisture_3_to_9cm": [soil] * n},
    }


def patch_weather(monkeypatch, raw):
    from app.providers import weather as wp

    monkeypatch.setattr(wp, "_fetch_open_meteo", lambda la, lo: wp.normalize(raw))


def reset_weather_provider():
    from app.providers.registry import get_provider

    p = get_provider("weather")
    p.state.last_ok = p.state.last_checked = None
    p.state.last_error = ""
