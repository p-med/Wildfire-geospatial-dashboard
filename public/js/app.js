//--------------------------------------------------------------------
// 0. GET USER INPUTS
//--------------------------------------------------------------------
import { get_analysis_layers, get_region, get_distance_thresholds } from './utils.js';

// ✅ Declare OUTSIDE so they're accessible everywhere
let analysis_layers = [];
let distance_thresholds = { high: 1000, moderate: 2500 };
let currentRegion = '';

// Update them when form changes
document.getElementById('analysisForm').addEventListener('change', (e) => {
    analysis_layers = get_analysis_layers();
    distance_thresholds = get_distance_thresholds();
    console.log("Updated layers:", analysis_layers);
    console.log("Updated thresholds:", distance_thresholds);
});

// Update when region changes
const selectRegion = document.getElementById('region');
selectRegion.addEventListener('change', () => {
    currentRegion = get_region();
    console.log("Updated region:", currentRegion);
});

//--------------------------------------------------------------------
// 1. GET SUPABASE DATA
//--------------------------------------------------------------------
// Now these work! ✅
console.log("Selected layers:", analysis_layers);
console.log("Distance thresholds:", distance_thresholds);
console.log("The user selected:", currentRegion);

const supabaseUrl = 'https://iiaakedzsrnokfmfpgqo.supabase.co';
const supabaseKey = 'sb_publishable_TqufV4iBhIJENiyXfM4TQQ_JmU1GLex';

// Check if the library is loaded before trying to use it
if (typeof supabase === 'undefined') {
    console.error("Supabase SDK not found. Check your HTML script tags.");
}

// Access the createClient function directly from the global supabase object
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// When the user clicks "Run Analysis" fetch data

async function fetchSupabaseFilteredData() {
    console.log("Fetching filtered data for region:", currentRegion);
    
    // ✅ Correct syntax: rpc('function_name', { param_name: value })
    const { data, error } = await _supabase.rpc('get_ind_comm', {
        region: currentRegion  // parameter name matches SQL function parameter
    });
    
    if (error) {
        console.error('Supabase error:', error);
        return;
    }
    
    console.log("Filtered data received:", data);
    
    // Remove old layer if exists
    if (activeLayers.indigenous) map.removeLayer(activeLayers.indigenous);
    
    // Add data to map
    activeLayers.indigenous = L.geoJSON(data, {
        style: { 
            color: "#2e6e7d", 
            weight: 2, 
            fillOpacity: 0.3 
        },
        onEachFeature: onEachFeature
    }).addTo(map);
}

// Listen to form submit (your button is type="submit")
document.getElementById('analysisForm').addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent page reload
    console.log("Running analysis for:", currentRegion);
    fetchSupabaseFilteredData();
});