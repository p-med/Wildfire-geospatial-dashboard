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
// LEAFLET CONFIG

// MAP

//-------------------------------------------------
// 1. Initialize the map
const map = L.map("map", { zoomControl: false }).setView(
  [-23.4425, -58.4438],
  6,
);
//---------------------------------------------------

//----------------------------------------------------
// 2. Add the base tile layer
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap",
}).addTo(map);
//--------------------------------------------------

//-------------------------------------------------
// 3. Define the style for our polygons
//3.1 Risk surface
function getStyle(feature, type) {
  //3.1.1 Type risk
  if (type === "risk") {
    return {
      fillColor: getColor(feature.properties.risk_level),
      weight: 1,
      opacity: 1,
      color: "",
      fillOpacity: 0.7,
    };
  }
  //3.1.2 Type admin 1
  if (type === "admin1") {
    return {
      fillOpacity: 0,
      color: "black",
      weight: 1.5,
    };
  }
  //3.1.2 Type admin 1
  if (type === "admin2") {
    return {
      fillOpacity: 0,
      color: "black",
      weight: 1,
    };
  }
}
//--------------------------------------------------

//---------------------------------------------------
// 4. Color logic (the Leaflet version of your "match" expression)
function getColor(d) {
  return d === 4 ? "#bd0026" : 
         d === 3 ? "#f03b20" : 
         d === 2 ? "#feb24c" : 
         d === 1 ? "#26a641"
          : "#ccc"; // Fallback
}
//------------------------------------------------------

//------------------------------------------------------
// 5. Create popups function
function onEachFeature(feature, layer) {
  // does this feature have a property named popupContent?
    if (feature.properties && feature.properties.popupContent) {
        layer.bindPopup(feature.properties.popupContent);
    }
}
//----------------------------------------------------

//----------------------------------------------------
// 6. Fetch and Load the data
async function loadData(map) {
  try {
    const risk_response = await fetch("api/queries/get_fire_risk.php");
    const admin1_response = await fetch("api/queries/get_admin1.php");
    const risk_surface_data = await risk_response.json();
    const admin1_data = await admin1_response.json();
    console.log(admin1_data)

    // 6.1 Create the GeoJSON layer and store it in a variable
    // 6.1.1 Risk surface
    const riskLayer = L.geoJSON(risk_surface_data, {
      style: (feature) => getStyle(feature, "risk"),
      interactive: false,
    }).addTo(map);
    //6.1.2 Admin 1
    const admin1Layer = L.geoJSON(admin1_data, {
      style: (feature) => getStyle(feature, "admin1"),
      onEachFeature: onEachFeature
    }).addTo(map);

    // 6.2 Now ask the LAYER for the bounds, not the raw JSON data
    const bounds = riskLayer.getBounds();

    // 6.3 Zoom the map to those bounds
    map.fitBounds(bounds);
  } catch (error) {
    console.error("Error loading GeoJSON:", error);
  }
}
//--------------------------------------------------------

//--------------------------------------------------------
// 7. Add controls
// 7.1 Legends
var legend = L.control({ position: "topright" });

legend.onAdd = function (map) {
  var div = L.DomUtil.create("div", "info legend"),
    grades = [4, 3, 2, 1],
    labels = {
      1: "Low risk",
      2: "Caution",
      3: "Moderate Risk",
      4: "High Risk",
    };

  // Add a Title
  div.innerHTML = "<h4>Wildfire Risk</h4>";
  // loop through our density intervals and generate a label with a colored square for each interval
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

//7.2 Add Information pane
var information = L.control({ position: "topleft" });

information.onAdd = function (map) {
  var div = L.DomUtil.create("div", "info legend"),
    grades = [4, 3, 2, 1],
    labels = {
      1: "Low risk",
      2: "Caution",
      3: "Moderate Risk",
      4: "High Risk",
    };

  // Add a Title
  div.innerHTML = "<h4>Information</h4><hr>";

  return div;
};

legend.addTo(map);
information.addTo(map);

// Execute the load
loadData(map);

// Ensures the map resizes correctly when the flex container changes
window.addEventListener("resize", () => {
  if (map) map.resize();
});

//-----------------------------------------------------------------------
