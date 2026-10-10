"""Phase 6: disease weather-risk rules and DBSCAN clustering (pure logic)."""
from types import SimpleNamespace

from app.services import radar
from app.services.disease_risk import disease_labels, label_crop, rule_for, weather_risk


def day(t_min=12, t_max=20, t_mean=16, humid_hours=8, rain_mm=0.0):
    return {"t_min": t_min, "t_max": t_max, "t_mean": t_mean, "humid_hours": humid_hours, "rain_mm": rain_mm}


def test_every_disease_has_a_rule_and_crop():
    labels = disease_labels()
    assert len(labels) == 26
    for l in labels:
        assert rule_for(l) in {"late_blight", "fungal_wet", "scab", "rust", "mildew", "bacterial", "mites", "whitefly", "not_weather"}
        assert label_crop(l)
    assert label_crop("Corn_(maize)___Common_rust_") == "maize"


def test_late_blight_hutton_criteria():
    hutton = day(t_min=11, humid_hours=7)
    dry = day(t_min=11, humid_hours=2)
    cold = day(t_min=6, humid_hours=10)
    assert weather_risk("Potato___Late_blight", [hutton, hutton, dry])["risk"] == "high"   # 2 consecutive
    assert weather_risk("Potato___Late_blight", [hutton, dry, hutton])["risk"] == "medium"  # not consecutive
    assert weather_risk("Potato___Late_blight", [cold, cold, dry])["risk"] == "low"


def test_other_rules():
    hot_dry = day(t_max=34, t_mean=29, humid_hours=0, rain_mm=0)
    assert weather_risk("Tomato___Spider_mites Two-spotted_spider_mite", [hot_dry] * 3)["risk"] == "high"
    assert weather_risk("Tomato___Early_blight", [day(t_mean=24, humid_hours=8)] * 3)["risk"] == "high"
    assert weather_risk("Tomato___Early_blight", [day(t_mean=24, humid_hours=0)] * 3)["risk"] == "low"
    assert weather_risk("Tomato___Tomato_mosaic_virus", [day()] * 3)["risk"] == "low"


def test_level_for():
    assert radar.level_for(2, "high") == "watch"
    assert radar.level_for(3, "medium") == "warning"
    assert radar.level_for(3, "low") == "watch"
    assert radar.level_for(5, "low") == "warning"
    assert radar.level_for(5, "high") == "outbreak"
    assert radar.level_for(8, "low") == "outbreak"


def scan(farmer, lat, lon, disease="Potato___Late_blight", demo=False):
    return SimpleNamespace(farmer_id=farmer, lat_grid=lat, lon_grid=lon, disease=disease, is_demo=demo)


def test_clustering_counts_farms_not_scans():
    # one farm scanning 10 times = 1 farm → no cluster
    assert radar.find_clusters([scan(1, 20.0, 73.8)] * 10) == []
    near = [scan(i, 20.0 + i * 0.01, 73.8) for i in range(1, 5)]          # 4 farms within ~4 km
    far = [scan(10, 21.0, 75.0), scan(11, 21.01, 75.0)]                   # separate pair ~200 km away
    other = [scan(20, 20.0, 73.8, "Tomato___Early_blight")]               # lone different disease
    clusters = radar.find_clusters(near + far + other)
    assert sorted(c["farms"] for c in clusters) == [2, 4]
    big = next(c for c in clusters if c["farms"] == 4)
    assert big["crop"] == "potato" and big["radius_km"] >= 1.0 and not big["is_demo"]


def test_haversine():
    assert abs(radar.haversine_km(20.0, 73.8, 20.09, 73.8) - 10.0) < 0.1
