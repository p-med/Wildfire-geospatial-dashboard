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

langDropdown.addEventListener('click', function(event) {
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
    const response = await fetch('/api/utils/get_map_config.php');

    if (!response.ok) {
      console.error('Failed to fetch map config:', response.status, response.statusText);
      return;
    }

    const config = await response.json();
    console.log(config);

    if (!config || !config.mapboxToken) {
      console.error('Mapbox token missing in configuration');
      return;
    }

    mapboxgl.accessToken = config.mapboxToken;

    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-58.4438, -23.4425], // Paraguay coordinates
      zoom: 5.5,
    });
  } catch (err) {
    console.error('Error loading map configuration:', err);
  }
})();

// Ensures the map resizes correctly when the flex container changes
window.addEventListener('resize', () => {
  if (map) map.resize();
});


//-----------------------------------------------------------------------