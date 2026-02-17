//--------------------------------------------------------------------
// 1. GLOBAL SETTINGS & STATE
//--------------------------------------------------------------------
const map = L.map("map", { zoomControl: false }).setView(
  [-23.4425, -58.4438],
  6,
);

// Using an object to keep track of layers makes clearing them much easier
const activeLayers = {
  risk: null,
  admin: null,
  households: null,
};

const CONFIG = {
  apiEndpoint: "api/queries/get_boundaries.php",
  actionMap: {
    admin1: "get_admin1",
    admin2: "get_admin2",
    households: "get_risk_households",
  },
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
// 3. STYLING & COLOR LOGIC (Updated)
//--------------------------------------------------------------------
const COLORS = {
  risk: (d) =>
    d === 4
      ? "#bd0026"
      : d === 3
        ? "#f03b20"
        : d === 2
          ? "#feb24c"
          : d === 1
            ? "#26a641"
            : "#ccc",
  choropleth: (d) =>
    d > 25000
      ? "#800026"
      : d > 10000
        ? "#E31A1C"
        : d > 5000
          ? "#FC4E2A"
          : d > 1000
            ? "#FEB24C"
            : "#FFEDA0",
  household: {
    High: "red",
    Moderate: "orange",
    "No risk": "gray",
  },
  // Added environmental symbology
  env: {
    protected: "#2e7d32", // Forest Green
    buffer: "#81c784", // Light Green
  },
  // Added indigenous theme
  indigenous: {
    fill: "#ADD8E6", // Light Blue
    border: "#4682B4", // Steel Blue for better definition
  },
};

function getStyle(feature, type) {
  switch (type) {
    case "risk":
      return {
        fillColor: COLORS.risk(feature.properties.risk_level),
        weight: 1,
        fillOpacity: 0.7,
        color: "transparent",
      };
    case "admin1":
      return { fillOpacity: 0, color: "black", weight: 1.5 };
    case "admin2":
      return {
        fillColor: COLORS.choropleth(feature.properties.M_Risk_area_ha),
        fillOpacity: 0.5,
        color: "black",
        weight: 1,
      };
    case "households":
      return {
        fillColor: COLORS.household[feature.properties.risk_class] || "gray",
        color: "white",
        weight: 1,
        fillOpacity: 0.9,
      };
    // New case for Protected Areas
    case "protected_areas":
      return {
        fillColor: COLORS.env.protected,
        fillOpacity: 0.4, // Transparent to see underlying risk/households
        color: "#1b5e20", // Darker green border
        weight: 2,
        dashArray: "3", // Optional: dashed line often denotes special zones
      };
    case "indigenous":
      return {
        fillColor: COLORS.indigenous.fill,
        fillOpacity: 0.5,
        // The border color dynamically changes based on risk_class
        color:
          COLORS.household[feature.properties.risk_class] ||
          COLORS.indigenous.border,
        weight: 1,
        dashArray: "5",
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
  layer.on("click", (e) => map.fitBounds(e.target.getBounds()));
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
    const layerKey = type === "households" ? "households" : "admin";
    if (activeLayers[layerKey]) map.removeLayer(activeLayers[layerKey]);

    // Create new Layer
    activeLayers[layerKey] = L.geoJSON(data.geojson, {
      style: (f) => getStyle(f, type),
      onEachFeature: onEachFeature,
      // Point handling logic
      pointToLayer: (f, latlng) =>
        type === "households"
          ? L.circleMarker(latlng, { radius: 6 })
          : L.marker(latlng),
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
      interactive: false,
    }).addTo(map);
    map.fitBounds(activeLayers.risk.getBounds());
  } catch (err) {
    console.error("Initial load error:", err);
  }
}

//--------------------------------------------------------------------
// 6. EVENT LISTENERS
//--------------------------------------------------------------------

async function populateInfo(id, content) {
  let element = document.getElementById(id);
  element.innerHTML = content;
}

function toggleVisibility(elementId) {
  const el = document.getElementById(elementId);
  if (el.style.display === "none") {
    el.style.display = "block"; // Or 'flex', 'inline', etc.
  } else {
    el.style.display = "none";
  }
}

document
  .getElementById("analysisForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault(); // Stop page reload

    // 1. Gather all values into one object
    const formData = new FormData(e.target);
    const params = new URLSearchParams(formData);

    // 2. Clear current map layers before loading new ones
    Object.values(activeLayers).forEach((layer) => {
      if (layer) map.removeLayer(layer);
    });

    // 3. One single request to get everything
    const response = await fetch(
      `api/queries/analysis.php?${params.toString()}`,
    );
    const data = await response.json();

    console.log(data);

    // 4. Handle the multi-part result

    if (data.admin1) {
      populateInfo("admin1", data.admin1.summary.content);
      activeLayers.admin1 = L.geoJSON(data.admin1.geojson, {
        style: (f) => getStyle(f, "admin1"),
        onEachFeature: onEachFeature,
      }).addTo(map);
    }

    // 4.1 Households
    if (data.households) {
      // Update section on side pane
      populateInfo("households", data.households.summary.content);

      activeLayers.households = L.geoJSON(data.households.geojson, {
        // Use your existing getStyle function
        style: (f) => getStyle(f, "households"),

        onEachFeature: onEachFeature,

        // Point handling logic:
        // We use a circleMarker so the styles from getStyle (fillColor, etc.) apply correctly
        pointToLayer: (f, latlng) => {
          return L.circleMarker(latlng, {
            radius: 3,
          });
        },
      }).addTo(map);

      // Optional: Zoom to the households once loaded
      if (data.households.geojson.features.length > 0) {
        map.fitBounds(activeLayers.households.getBounds());
      }
    }

    // 4.2 Protected Areas
    if (data.protected_areas) {
      // Populate side panel
      populateInfo("protected", data.protected_areas.summary.content);
      // Get boundary
      activeLayers.protected = L.geoJSON(data.protected_areas.geojson, {
        style: (f) => getStyle(f, "protected_areas"),
        onEachFeature: onEachFeature,
      }).addTo(map);
    }

    // 4.3 Indigenous communities
    if (data.indigenous) {
      populateInfo("indigenous_comm", data.indigenous.summary.content);
      activeLayers.indigenous = L.geoJSON(data.indigenous.geojson, {
        style: (f) => getStyle(f, "indigenous"),
        onEachFeature: onEachFeature,
      }).addTo(map);
    }

    toggleVisibility("analysisForm");
    document.getElementById("new_analysis").style.display = "inline-block";
    document.getElementById("new_analysis").style.width = "50%";
    document.getElementById("download_data").style.display = "inline-block";
    document.getElementById("download_data").style.width = "50%";
    document.getElementById("description").style.display = "block";
});

document.getElementById("new_analysis").addEventListener("click", (e) => {
    // 1. Show the form again
    document.getElementById("analysisForm").style.display = "block";
    
    // 2. Hide the analysis buttons
    document.getElementById("new_analysis").style.display = "none";
    document.getElementById("download_data").style.display = "none";
    
    // 3. Clear/Hide the results summary (description div)
    // Note: If you want to hide the whole container:
    document.getElementById("description").style.display = "none";
    
    // 4. Clear the map layers for a fresh start
    Object.values(activeLayers).forEach((layer) => {
        if (layer) map.removeLayer(layer);
    });
  });

window.addEventListener("resize", () => map?.invalidateSize());

// Start
loadInitialRisk();
