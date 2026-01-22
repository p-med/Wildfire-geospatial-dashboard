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
// MAPBOX CONFIG

// MAP
// Load token and initialize map safely
let map = null;
(async () => {
  try {
    const response = await fetch("/api/utils/get_map_config.php");
    const response_1 = await fetch("/api/queries/get_polygons.php");

    // Load map
    if (!response.ok) {
      console.error(
        "Failed to fetch map config:",
        response.status,
        response.statusText,
      );
      return;
    }

    const config = await response.json();

    if (!config || !config.mapboxToken) {
      console.error("Mapbox token missing in configuration");
      return;
    }

    mapboxgl.accessToken = config.mapboxToken;

    map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/light-v11",
      center: [-58.4438, -23.4425], // Paraguay coordinates
      zoom: 5.5,
    });

    // Load data to map

    const fire_risk = await response_1.json();
    map.on("load", () => {
      console.log(fire_risk);
      map.addSource("fire_risk", {
        type: "geojson",
        // Use a URL for the value for the `data` property.
        data: fire_risk,
      });

      map.addLayer({
        id: "fire-layer",
        type: "fill",
        source: "fire_risk",
        paint: {
          "fill-color": [
            "match",
            ["get", "risk_level"],
            1,
            "#26a641", // Level 1: Low (Green)
            2,
            "#feb24c", // Level 2: Moderate (Orange/Yellow)
            3,
            "#f03b20", // Level 3: High (Bright Red)
            4,
            "#bd0026", // Level 4: Extreme (Dark Red)
            "#ccc", // Fallback (Gray)
          ],
          "fill-opacity": 0.7
        },
      });
    });
  } catch (err) {
    console.error("Error loading map configuration:", err);
  }
})();

// Ensures the map resizes correctly when the flex container changes
window.addEventListener("resize", () => {
  if (map) map.resize();
});

//-----------------------------------------------------------------------
