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
    const response_fire = await fetch("/api/queries/get_fire_risk.php");
    const response_admin1 = await fetch("/api/queries/get_admin.php");

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

    // Load response to json
    const fire_risk = await response_fire.json();
    const admin1 = await response_admin1.json();
    
    // Load map
    map.on("load", () => {
      console.log(admin1);

      // Add sources
      map.addSource("fire_risk", {
        type: "geojson",
        data: fire_risk,
      });
      map.addSource("admin1", {
        type: "geojson",
        data: admin1,
      });

      // Add layers
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
          "fill-opacity": 0.7,
        },
      });

      map.addLayer({
        id: "admin1-fill",
        type: "line",
        source: "admin1",
        paint: {
          "line-color": "#000000",
          "line-width": 1,
        },
      });

      map.addLayer({
        id: "admin1-outline",
        type: "fill",
        source: "admin1",
        paint: {
          "fill-color": "rgba(0,0,0,0)",
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
