//--------------------------------------------------------------------
// 0. IMPORTS & USER INPUT STATE
//--------------------------------------------------------------------
import { get_analysis_layers, get_region, get_distance_thresholds } from './utils.js';

// User input variables - accessible throughout the file
let analysis_layers = [];
let distance_thresholds = { high: 1000, moderate: 2500 };
let currentRegion = '';

//--------------------------------------------------------------------
// 1. GLOBAL SETTINGS & STATE
//--------------------------------------------------------------------
const map = L.map("map", { zoomControl: false, preferCanvas: true }).setView(
  [-23.4425, -58.4438],
  6
);

const activeLayers = {
  fires: null,
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
function toTitleCase(str) {
  return str.toLowerCase().split(' ').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

function onEachFeature(feature, layer) {
    if (feature.properties) {
        // Check for adm1_name (Districts) OR distrito (Households)
        const nameValue = feature.properties.adm1_name || feature.properties.distrito;
        
        // Only call toTitleCase if nameValue actually exists
        const label = nameValue ? toTitleCase(nameValue) : "Unknown Location";
        
        const popupLabel = "Location: " + label;
        layer.bindPopup(`<strong>${popupLabel}</strong>`);
    }
    
    // Safety check: only use getBounds if it's a polygon/line. 
    // Points (households) don't have bounds, they have a latlng.
    layer.on("click", (e) => {
        if (layer.getBounds) {
            map.fitBounds(e.target.getBounds());
        } else if (layer.getLatLng) {
            map.setView(e.target.getLatLng(), 12);
        }
    });
}

window.addEventListener("resize", () => map?.invalidateSize());

//--------------------------------------------------------------------
// 4. SUPABASE CLIENT
//--------------------------------------------------------------------
const supabaseUrl = 'https://iiaakedzsrnokfmfpgqo.supabase.co';
const supabaseKey = 'sb_publishable_TqufV4iBhIJENiyXfM4TQQ_JmU1GLex';

if (typeof supabase === 'undefined') {
    console.error("Supabase SDK not found. Check your HTML script tags.");
}

const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

//--------------------------------------------------------------------
// 5. DATA FETCHING FUNCTIONS
//--------------------------------------------------------------------
async function fetchChacoBoundaries() {
    console.log("Fetching Chaco districts...");
    
    const { data, error } = await _supabase.rpc('get_chaco_districts_geojson');

    if (error) {
        console.error('Supabase error:', error);
        return;
    }

    console.log("Data received from Supabase:", data);
    if (activeLayers.admin) map.removeLayer(activeLayers.admin);

    // Add data to map
    activeLayers.admin = L.geoJSON(data, {
    pane: 'adminPane',
    style: { 
        color: "#2C3E50", // Neutral Grey
        weight: 1, 
        dashArray: "4, 4", // Dashed lines look more like official administrative boundaries
        fillOpacity: 0 
    },
        onEachFeature: onEachFeature
    }).addTo(map);

    // Get the bounding box
    if (data.features.length > 0) {
        const bounds = activeLayers.admin.getBounds();
        map.fitBounds(bounds);
        
        // Store bounds for NASA API call
        window.chacoBounds = {
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth()
        };
        
        console.log("Chaco bounds:", window.chacoBounds);
    }
}

async function fetchLiveFires() {
    try {
        // Use actual Chaco bounds if available, otherwise fallback
        const bounds = window.chacoBounds || {
            west: -63,
            south: -26,
            east: -54,
            north: -17
        };
        
        const { data, error } = await _supabase.functions.invoke('get-live-fires', {
            body: {
                area: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
            }
        });

        if (error) {
            console.error('Error fetching NASA data:', error);
            return;
        }

        console.log("Live fires loaded:", data.features.length, "fires");
        
        if (activeLayers.fires) map.removeLayer(activeLayers.fires);
        
        activeLayers.fires = L.geoJSON(data, {
            pane: 'firePane',
            interactive: true,
            // Inside fetchLiveFires() -> L.geoJSON logic
            pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                    radius: 4,
                    fillColor: "#D35400", // Burnt Orange
                    color: "#FFFFFF",     // White stroke makes points "pop"
                    weight: 1,
                    fillOpacity: 0.9
                });
            },
            onEachFeature: (feature, layer) => {
                const p = feature.properties;
                layer.bindPopup(`
                    <strong>Active Fire</strong><br>
                    Confidence: ${p.confidence}<br>
                    Date: ${p.acq_date}<br>
                    FRP: ${p.frp}
                `);
            }
        }).addTo(map);

    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

async function fetchFilteredLayerData() {
    console.log("Fetching filtered data for region:", currentRegion);

    for (const layer of analysis_layers) {
        let rpcName = '';
        let options = {};
        let paneName = '';

        if (layer === 'indigenous') {
            paneName = 'indigenousPane';
            rpcName = 'get_ind_comm';
            options = {
                style: { 
                    color: "transparent", // No border for a cleaner look
                    fillColor: "#4A707A", // Slate/Earth Teal
                    fillOpacity: 0.4 
                }
            };
        } 
        else if (layer === 'households') {
            paneName = 'householdPane';
            rpcName = 'get_selected_hh';
            options = { 
                pointToLayer: (feature, latlng) => {
                    return L.circleMarker(latlng, {
                        radius: 1,       // Very small for professional look
                        fillColor: "#229ee6", // Ochre/Deep Orange
                        color: "#229ee6",
                        weight: 0.5,
                        opacity: 0.5,      // Ghosting effect for clusters
                        fillOpacity: 0.7
                    });
                }
            };
        }
        else if (layer === 'protected_areas') {
            paneName = 'householdPane';
            rpcName = 'get_pa';
            options = {
                style: { 
                    color: "#2E7D32", // Dark Green
                    weight: 2, 
                    fillOpacity: 0.3 
                }
            };
        }

        if (rpcName) {
            const { data, error } = await _supabase.rpc(rpcName, {
                region: currentRegion.trim() 
            });

            if (error) continue;

            if (activeLayers[layer]) map.removeLayer(activeLayers[layer]);

            activeLayers[layer] = L.geoJSON(data, {
              pane: paneName,
                ...options,
                onEachFeature: onEachFeature
            }).addTo(map);
        }
    }
}

//--------------------------------------------------------------------
// 6. ANALYSIS FUNCTIONS
//--------------------------------------------------------------------
async function runFireAnalysis() {
    console.log("=== Running Fire Analysis ===");
    console.log("Region:", currentRegion);
    console.log("Layers:", analysis_layers);
    console.log("Thresholds:", distance_thresholds);
    
    // Fetch filtered layer data based on user selections
    await fetchFilteredLayerData();
    
    // TODO: Add Turf.js analysis here
    
    // const results = analyzeFireProximity(...);
}

//--------------------------------------------------------------------
// 7. EVENT HANDLERS
//--------------------------------------------------------------------
// Update user inputs when form changes
document.getElementById('analysisForm').addEventListener('change', (e) => {
    analysis_layers = get_analysis_layers();
    distance_thresholds = get_distance_thresholds();
    console.log("Updated layers:", analysis_layers);
    console.log("Updated thresholds:", distance_thresholds);
});

// Update region when dropdown changes
const selectRegion = document.getElementById('region');
selectRegion.addEventListener('change', () => {
    currentRegion = get_region();
    console.log("Updated region:", currentRegion);
});

// Run analysis when form is submitted
document.getElementById('analysisForm').addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent page reload
    runFireAnalysis();
});

//--------------------------------------------------------------------
// 8. INITIALIZE
//--------------------------------------------------------------------
async function initializeMap() {
    // Define the stacking order (higher z-index = higher on screen)
    map.createPane('adminPane').style.zIndex = 400;
    map.createPane('indigenousPane').style.zIndex = 410;
    map.createPane('protectedPane').style.zIndex = 420;
    map.createPane('householdPane').style.zIndex = 430;
    map.createPane('firePane').style.zIndex = 450;

    await fetchChacoBoundaries(); // Load districts and calculate bounds
    await fetchLiveFires();        // Use those bounds for fires

    map.getPane('firePane').style.pointerEvents = 'auto';
}

initializeMap();