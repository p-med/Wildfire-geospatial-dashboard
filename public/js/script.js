//--------------------------------------------------------------------
// 1. GLOBAL SETTINGS & STATE
//--------------------------------------------------------------------
const map = L.map("map", { zoomControl: false }).setView([-23.4425, -58.4438], 6);

// Using an object to keep track of layers makes clearing them much easier
const activeLayers = {
    risk: null,
    admin: null,
    households: null
};

const CONFIG = {
    apiEndpoint: "api/queries/get_boundaries.php",
    actionMap: {
        admin1: "get_admin1",
        admin2: "get_admin2",
        households: "get_risk_households"
    }
};

//--------------------------------------------------------------------
// 2. UI & LANGUAGE LOGIC
//--------------------------------------------------------------------
const langBtn = document.getElementById("langBtn");
const langDropdown = document.getElementById("langDropdown");

langBtn.addEventListener("click", (e) => {
    e.preventDefault();
    langBtn.classList.toggle("active");
    langDropdown.classList.toggle("show");
});

window.addEventListener("click", (e) => {
    if (!langBtn.contains(e.target)) {
        langDropdown.classList.remove("show");
        langBtn.classList.remove("active");
    }
});

langDropdown.addEventListener("click", (e) => {
    langBtn.innerHTML = e.target.textContent;
});

//--------------------------------------------------------------------
// 3. STYLING & COLOR LOGIC
//--------------------------------------------------------------------
const COLORS = {
    risk: (d) => d === 4 ? "#bd0026" : d === 3 ? "#f03b20" : d === 2 ? "#feb24c" : d === 1 ? "#26a641" : "#ccc",
    choropleth: (d) => d > 25000 ? "#800026" : d > 10000 ? "#E31A1C" : d > 5000 ? "#FC4E2A" : d > 1000 ? "#FEB24C" : "#FFEDA0",
    household: {
        "High": "red",
        "Moderate": "orange",
        "No risk": "gray"
    }
};

function getStyle(feature, type) {
    switch (type) {
        case "risk":
            return { fillColor: COLORS.risk(feature.properties.risk_level), weight: 1, fillOpacity: 0.7, color: "transparent" };
        case "admin1":
            return { fillOpacity: 0, color: "black", weight: 1.5 };
        case "admin2":
            return { fillColor: COLORS.choropleth(feature.properties.M_Risk_area_ha), fillOpacity: 0.5, color: "black", weight: 1 };
        case "households":
            return { 
                fillColor: COLORS.household[feature.properties.risk_class] || "gray",
                color: "white", weight: 1, fillOpacity: 0.9 
            };
        default:
            return {};
    }
}

//--------------------------------------------------------------------
// 4. MAP UTILITIES & CONTROLS
//--------------------------------------------------------------------
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap",
}).addTo(map);

function onEachFeature(feature, layer) {
    if (feature.properties?.popupContent) {
        layer.bindPopup(feature.properties.popupContent);
    }
    layer.on('click', (e) => map.fitBounds(e.target.getBounds()));
}

// Custom Control logic remains the same (omitted for brevity in refactor)
// ... [Insert your CustomControl code here] ...

//--------------------------------------------------------------------
// 5. DATA LOADING LOGIC
//--------------------------------------------------------------------

async function loadGeom(regionName, type) {
    try {
        const action = CONFIG.actionMap[type];
        const url = `${CONFIG.apiEndpoint}?action=${action}&region=${encodeURIComponent(regionName)}`;
        
        const response = await fetch(url);
        const data = await response.json();

        // Update UI Side Pane
        if (data.summary?.content) {
            document.getElementById(type).innerHTML = data.summary.content;
        }

        // Cleanup existing layer of this type
        const layerKey = type === 'households' ? 'households' : 'admin';
        if (activeLayers[layerKey]) map.removeLayer(activeLayers[layerKey]);

        // Create new Layer
        activeLayers[layerKey] = L.geoJSON(data.geojson, {
            style: (f) => getStyle(f, type),
            onEachFeature: onEachFeature,
            // Point handling logic
            pointToLayer: (f, latlng) => type === "households" ? L.circleMarker(latlng, { radius: 6 }) : L.marker(latlng)
        }).addTo(map);

        map.fitBounds(activeLayers[layerKey].getBounds());

    } catch (err) {
        console.error(`Failed to load ${type}:`, err);
    }
}

async function loadInitialRisk() {
    try {
        const res = await fetch("api/queries/get_fire_risk.php");
        const data = await res.json();
        activeLayers.risk = L.geoJSON(data, {
            style: (f) => getStyle(f, "risk"),
            interactive: false
        }).addTo(map);
        map.fitBounds(activeLayers.risk.getBounds());
    } catch (err) { console.error("Initial load error:", err); }
}

//--------------------------------------------------------------------
// 6. EVENT LISTENERS
//--------------------------------------------------------------------

document.getElementById("regions").addEventListener("change", (e) => {
    const val = e.target.value;
    loadGeom(val, "admin1");
    loadGeom(val, "households");
});

window.addEventListener("resize", () => map?.invalidateSize());

// Start
loadInitialRisk();