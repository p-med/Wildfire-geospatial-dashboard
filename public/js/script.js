//----------------------------------------------------------------------
// LANGUAGES

const langBtn = document.getElementById("langBtn");
const langDropdown = document.getElementById("langDropdown");
const last_lang = document.getElementById("lng4");

langBtn.addEventListener("click", (e) => {
  e.preventDefault();
  langDropdown.classList.toggle("show");
  // Toggle 'active' class to rotate the arrow
  langBtn.classList.toggle("active");
});

window.addEventListener("click", (e) => {
  if (!langBtn.contains(e.target)) {
    langDropdown.classList.remove("show");
    langBtn.classList.remove("active"); // Reset arrow if clicking outside
  }
});

langDropdown.addEventListener("click", function (event) {
  // event.target refers to the specific element that was clicked (e.g., btn1 or btn2)
  langBtn.innerHTML = event.target.textContent;
});
//--------------------------------------------------------------------

//--------------------------------------------------------------------
// LEAFLET CONFIGURATION
//--------------------------------------------------------------------

// 1. GLOBAL VARIABLES & STATE
//-------------------------------------------------
const map = L.map("map", { zoomControl: false }).setView(
  [-23.4425, -58.4438],
  6,
);

let admin1Layer;
let admin2Layer;
let riskLayer;
let roads;
let protected_areas;

// Data State Variables
let high_risk_area;
let moderate_risk_area;
let low_risk_area;
let region_w_more_fire;
let risk_array;
let max_percent;

// 2. UTILITY & TEMPLATE FUNCTIONS
//-------------------------------------------------
// 2.1 Color Logic
function getColor(d) {
  return d === 4
    ? "#bd0026"
    : d === 3
      ? "#f03b20"
      : d === 2
        ? "#feb24c"
        : d === 1
          ? "#26a641"
          : "#ccc";
}

// 2.2 UI HTML Templates
function getInfoPane(risk_array) {
  let info_pane_html = `
    <h4>Overview</h4>
    <hr><br>
    <p>
      The Chaco Region has a total of <strong>${Number(risk_array[0]).toLocaleString()}</strong> hectares of
      <strong>high risk</strong> areas. 
    </p>
    <br>
    <p>
      That is <strong>${Number(risk_array[1]).toLocaleString()}%</strong> of the total risk, concentrated within
      the <strong>${risk_array[2]}</strong> region.
    </p>
  `;
  return info_pane_html;
}

// 3. LAYER STYLING
//-------------------------------------------------
function getStyle(feature, type) {
  // 3.1 Type: Risk Surface
  if (type === "risk") {
    return {
      fillColor: getColor(feature.properties.risk_level),
      weight: 1,
      opacity: 1,
      color: "",
      fillOpacity: 0.7,
    };
  }
  // 3.2 Type: Admin 1 (Departments)
  if (type === "admin1") {
    return {
      fillOpacity: 0,
      color: "black",
      weight: 1.5,
    };
  }
  // 3.3 Type: Admin 2 (Districts)
  if (type === "admin2") {
    return {
      fillOpacity: 0,
      color: "black",
      weight: 1,
    };
  }
}

// 4. INTERACTION LOGIC
//-------------------------------------------------
// 4.1 Highlight on Hover
function highlightFeature(e) {
  var layer = e.target;
  layer.setStyle({
    weight: 1,
    color: "#666",
    dashArray: "",
    fillOpacity: 0.1,
  });
  layer.bringToFront();
}

// 4.2 Reset on Mouseout
function resetHighlight(e) {
  admin1Layer.resetStyle(e.target);
}

// 4.3 Click to Zoom
function zoomToFeature(e) {
  map.fitBounds(e.target.getBounds());
}

// 4.4 Feature Binding (Popups & Events)
function onEachFeature(feature, layer) {
  if (feature.properties && feature.properties.popupContent) {
    layer.bindPopup(feature.properties.popupContent);
  }
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature,
  });
}

// 5. UI CONTROLS (Information Pane & Legends)
//-------------------------------------------------
// 5.1 Base Tile Layer
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap",
}).addTo(map);

// 5.2 Information Pane Setup
var information = L.control({ position: "topleft" });

information.onAdd = function (map) {
  this._div = L.DomUtil.create("div", "info legend");
  this.update();
  return this._div;
};

information.update = function (risk_array) {
  this._div.innerHTML = getInfoPane(risk_array || "Calculating...");
};

// 5.3 Legend Setup
var legend = L.control({ position: "bottomright" });

legend.onAdd = function (map) {
  var div = L.DomUtil.create("div", "info legend"),
    grades = [4, 3, 2, 1],
    labels = {
      1: "Low risk",
      2: "Caution",
      3: "Moderate Risk",
      4: "High Risk",
    };

  div.innerHTML = "<h4>Wildfire Risk</h4>";
  for (var i = 0; i < grades.length; i++) {
    div.innerHTML +=
      '<i style="background:' +
      getColor(grades[i]) +
      '"></i> ' +
      labels[grades[i]] +
      "<br>";
  }
  return div;
};

// 5.4 Add Controls to Map
legend.addTo(map);
information.addTo(map);

// 6. DATA LOADING & INITIALIZATION
//-------------------------------------------------
async function loadData(map) {
  try {
    const risk_response = await fetch("api/queries/get_fire_risk.php");
    const admin1_response = await fetch("api/queries/get_boundaries.php");
    const risk_surface_data = await risk_response.json();

    // Inside loadData try block:
    const responseData = await admin1_response.json();

    // 1. Get the summary data
    const summary = responseData.summary;
    region_w_more_fire = summary.top_region_name; // Now it's dynamic!
    high_risk_area = summary.total_risk_ha;
    max_percent = summary.max_percent;
    risk_array = [high_risk_area, max_percent, region_w_more_fire];

    // 2. Get the GeoJSON for Leaflet
    const admin1_data = responseData.geojson;

    // Update the UI
    information.update(risk_array);

    // 6.2 Initialize Layers
    riskLayer = L.geoJSON(risk_surface_data, {
      style: (feature) => getStyle(feature, "risk"),
      interactive: false,
    }).addTo(map);

    admin1Layer = L.geoJSON(admin1_data, {
      style: (feature) => getStyle(feature, "admin1"),
      onEachFeature: onEachFeature,
    }).addTo(map);

    // 6.3 Map Viewport Adjustment
    const bounds = riskLayer.getBounds();
    map.fitBounds(bounds);
  } catch (error) {
    console.error("Error loading GeoJSON:", error);
  }
}

// 7. EXECUTION & EVENT LISTENERS
//-------------------------------------------------
// 7.1 Load data to map
loadData(map);

// 7.2 Get button's region
// Listen for when a popup opens to "activate" the See More button
map.on('popupopen', function(e) {
    const container = e.popup._contentNode;
    const btn = container.querySelector('.popup_button');
    
    if (btn) {
        btn.onclick = function() {
            const region = this.getAttribute('data-region');
            console.log("Loading Admin 2 for:", region);
            // Here you will call your future loadAdmin2(region) function
        };
    }
});

window.addEventListener("resize", () => {
  if (map) map.invalidateSize();
});
