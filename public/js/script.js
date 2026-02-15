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

//2.1.2 Color logic for choropleth
function getChoropleth(d) {
    return d > 25000 ? '#800026' :
           d > 20000  ? '#BD0026' :
           d > 10000  ? '#E31A1C' :
           d > 5000  ? '#FC4E2A' :
           d > 2500   ? '#FD8D3C' :
           d > 1000   ? '#FEB24C' :
           d > 50  ? '#FED976' :
                      '#FFEDA0';
}

// 2.2 UI HTML Templates
function getInfoPane(risk_array, elemnt1, elemnt2) {
  // Get HTML elements
  let element1 = document.getElementById(elemnt1);
  let element2 = document.getElementById(elemnt2);
  // Get two HTML elements
  const originalText1 = element1.textContent;
  const originalText2 = element2.textContent;
  // Get array values
  const tot_hectares = Number(risk_array[0]).toLocaleString()
  const percentage = Number(risk_array[1]).toFixed(2).toLocaleString()
  const region = risk_array[2]
  // Replace contents
  const newText1 = originalText1.replace(/\{total_hectares\}/g,tot_hectares);
  const newText2 = originalText2.replace(/\{percentage\}/g,percentage).replace(/\{region\}/g,region);
  // Assign new strings to elements
  element1.textContent = newText1
  element2.textContent = newText2
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
      fillColor: getChoropleth(feature.properties.M_Risk_area_ha),
      fillOpacity: 0.5,
      color: "black",
      weight: 1,
    };
  }
}

// 4. INTERACTION LOGIC
//-------------------------------------------------
// 4.1 Highlight
function highlightFeature(e) {
  var layer = e.target;
  layer.setStyle({
    weight: 1,
    color: "#333",
    fillOpacity: 0.3,
  });
  layer.bringToFront();
}

// 4.2 Dynamic Reset
function resetHighlight(e) {
  // Reset whichever layer is currently active
  if (admin2Layer && map.hasLayer(admin2Layer)) {
    admin2Layer.resetStyle(e.target);
  } else if (admin1Layer) {
    admin1Layer.resetStyle(e.target);
  }
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

// Home
var CustomControl = L.Control.extend({
    options: {
        position: 'topright' // Position the control at the top left
    },

    onAdd: function (map) {
        // Create a container div for the buttons
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        
        // Create the custom button element
        var button = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-top-and-bottom', container);
        button.innerHTML = '<i class="fa-regular fa-house"></i>'; // Or use an icon/image
        button.href = '#';
        button.title = 'Zoom Home';

        // Add a click event listener
        L.DomEvent.on(button, 'click', function (e) {
            L.DomEvent.stop(e); // Prevent the default link behavior
            map.setView([51.505, -0.09], 13); // Define your custom action (e.g., zoom to home extent)
        });

        // Add default zoom control within the same container
        var zoomInButton = L.DomUtil.create('a', 'leaflet-bar-part', container);
        zoomInButton.innerHTML = '+';
        zoomInButton.href = '#';
        L.DomEvent.on(zoomInButton, 'click', function(e) {
            L.DomEvent.stop(e);
            map.zoomIn();
        });
        
        var zoomOutButton = L.DomUtil.create('a', 'leaflet-bar-part', container);
        zoomOutButton.innerHTML = '-';
        zoomOutButton.href = '#';
        L.DomEvent.on(zoomOutButton, 'click', function(e) {
            L.DomEvent.stop(e);
            map.zoomOut();
        });

        return container;
    },

    onRemove: function (map) {
        // Nothing to do here
    }
});

// 5.4 Add Controls to Map
legend.addTo(map);
// information.addTo(map);
map.addControl(new CustomControl());


// 6. DATA LOADING & INITIALIZATION
//-------------------------------------------------
// 6.1 LOAD INITIAL DATA

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
    // Execute function
    getInfoPane(risk_array,"overview-paragraph1","overview-paragraph2")
    // 2. Get the GeoJSON for Leaflet
    const admin1_data = responseData.geojson;

    // Update the UI
    // information.update(risk_array);

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

// 6.2 LOAD ADMIN 2 DATA
async function loadAdmin2(regionName) {
  try {
    // 1. Fetch data using the 'action' and 'region' parameters
    const url = `api/queries/get_boundaries.php?action=get_admin2&region=${encodeURIComponent(regionName)}`;
    const response = await fetch(url);
    const responseData = await response.json();

    // 2. Clear existing Admin 1 Layer so they don't overlap
    if (admin1Layer) {
      map.removeLayer(admin1Layer);
    }

    // 3. Add the new Admin 2 (Districts) Layer
    admin2Layer = L.geoJSON(responseData.geojson, {
      style: (feature) => getStyle(feature, "admin2"),
      onEachFeature: onEachFeature // Re-use your existing interaction logic
    }).addTo(map);

    // 4. Update the Information Pane with the specific Department stats
    const summary = responseData.summary;
    const admin2_risk_array = [summary.total_risk_ha, "N/A", summary.top_region_name];
    // information.update(admin2_risk_array);

    // 5. Zoom to the new area
    map.fitBounds(admin2Layer.getBounds());

  } catch (error) {
    console.error("Error loading Admin 2 data:", error);
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
        };
    }
});

window.addEventListener("resize", () => {
  if (map) map.invalidateSize();
});