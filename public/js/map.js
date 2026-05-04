//--------------------------------------------------------------------
// 1. GLOBAL SETTINGS & STATE
//--------------------------------------------------------------------
const map = L.map("map", { zoomControl: false }).setView(
  [-23.4425, -58.4438],
  6
);

const activeLayers = {
  risk: null,
  admin: null,
  households: null,
  protected: null,
  indigenous: null
};

//--------------------------------------------------------------------
// 2. BASE LAYERS
//--------------------------------------------------------------------
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap",
}).addTo(map);

//--------------------------------------------------------------------
// 3. MAP UTILITIES
//--------------------------------------------------------------------
function onEachFeature(feature, layer) {
  // If your SQL function returns standard column names, 
  // you might need to adjust 'popupContent' to the actual column name (e.g., 'dist_name')
  if (feature.properties) {
    const popupLabel = feature.properties.name || feature.properties.popupContent || "Area";
    layer.bindPopup(`<strong>${popupLabel}</strong>`);
  }
  layer.on("click", (e) => map.fitBounds(e.target.getBounds()));
}

window.addEventListener("resize", () => map?.invalidateSize());

//--------------------------------------------------------------------
// 4. SUPABASE INTEGRATION
//--------------------------------------------------------------------

const supabaseUrl = 'https://iiaakedzsrnokfmfpgqo.supabase.co';
const supabaseKey = 'sb_publishable_TqufV4iBhIJENiyXfM4TQQ_JmU1GLex';

// Check if the library is loaded before trying to use it
if (typeof supabase === 'undefined') {
    console.error("Supabase SDK not found. Check your HTML script tags.");
}

// Access the createClient function directly from the global supabase object
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

async function fetchSupabaseData() {
    console.log("Fetching Chaco districts...");
    
    // Calls the RPC function you created in the Supabase SQL Editor
    const { data, error } = await _supabase.rpc('get_chaco_districts_geojson');

    if (error) {
        console.error('Supabase error:', error);
        return;
    }

    console.log("Data received from Supabase:", data);
    if (activeLayers.admin) map.removeLayer(activeLayers.admin);

    // 2. Add data to map
    activeLayers.admin = L.geoJSON(data, {
        style: { 
            color: "#2e7d32", 
            weight: 2, 
            fillOpacity: 0.3 
        },
        onEachFeature: onEachFeature
    }).addTo(map);

    // 3. Zoom to the new data
    if (data.features.length > 0) {
        map.fitBounds(activeLayers.admin.getBounds());
    }
}

// Initial Load
fetchSupabaseData();