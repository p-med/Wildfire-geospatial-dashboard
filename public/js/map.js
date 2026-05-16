//--------------------------------------------------------------------
// 0. IMPORTS & USER INPUT STATE
//--------------------------------------------------------------------
import { get_analysis_layers, get_region, get_distance_thresholds } from './utils.js';

// User input variables - accessible throughout the file
let analysis_layers = [];
let distance_thresholds = { high: 1000, moderate: 2500 };
let currentRegion = '';
let latestResults = null; // Store latest analysis results for download

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

// Layer group dedicated to showcasing spatial analysis outputs
let analysisResultsGroup = L.layerGroup().addTo(map);

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
        const nameValue = feature.properties.adm1_name || feature.properties.distrito;
        const label = nameValue ? toTitleCase(nameValue) : "Unknown Location";
        const popupLabel = "Location: " + label;
        layer.bindPopup(`<strong>${popupLabel}</strong>`);
    }
    
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

    if (activeLayers.admin) map.removeLayer(activeLayers.admin);

    activeLayers.admin = L.geoJSON(data, {
        pane: 'adminPane',
        style: { 
            color: "#2C3E50", 
            weight: 1, 
            dashArray: "4, 4", 
            fillOpacity: 0 
        },
        onEachFeature: onEachFeature
    }).addTo(map);

    if (data.features.length > 0) {
        const bounds = activeLayers.admin.getBounds();
        map.fitBounds(bounds);
        
        window.chacoBounds = {
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth()
        };
    }
}

async function fetchLiveFires() {
    try {
// Explicitly fallback to a reliable, verified string if bounds aren't ready
        let areaString = "-63,-26,-54,-17"; 

        if (window.chacoBounds) {
            const b = window.chacoBounds;
            areaString = `${b.west},${b.south},${b.east},${b.north}`;
        }
        
        console.log("Requesting fires for bounding box:", areaString);

        const { data, error } = await _supabase.functions.invoke('get-live-fires', {
            body: { area: areaString }
        });

        if (error) {
            console.error('Error fetching NASA data:', error);
            return;
        }
        
        if (activeLayers.fires) map.removeLayer(activeLayers.fires);
        
        activeLayers.fires = L.geoJSON(data, {
            pane: 'firePane',
            interactive: true,
            pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                    radius: 4,
                    fillColor: "#D35400", 
                    color: "#FFFFFF",     
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
        let stateKey = layer;

        if (layer === 'indigenous') {
            paneName = 'indigenousPane';
            rpcName = 'get_ind_comm';
            options = {
                style: { 
                    color: "transparent", 
                    fillColor: "#4A707A", 
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
                        radius: 1,       
                        fillColor: "#229ee6", 
                        color: "#229ee6",
                        weight: 0.5,
                        opacity: 0.5,      
                        fillOpacity: 0.7
                    });
                }
            };
        }
        else if (layer === 'protected_areas') {
            paneName = 'protectedPane';
            rpcName = 'get_pa';
            stateKey = 'protected';
            options = {
                style: { 
                    color: "#2E7D32", 
                    weight: 2, 
                    fillOpacity: 0.3 
                }
            };
        }

        if (rpcName) {
            const { data, error } = await _supabase.rpc(rpcName, {
                region: currentRegion.trim() 
            });

            if (error) {
                console.error(`Error loading RPC dataset ${rpcName}:`, error);
                continue;
            }

            if (activeLayers[stateKey]) map.removeLayer(activeLayers[stateKey]);

            activeLayers[stateKey] = L.geoJSON(data, {
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
function analyzeFireProximity(fireLayer, targetLayer, thresholds) {
    const results = {
        highRisk: [],
        moderateRisk: [],
        total: 0
    };

    if (!fireLayer || !targetLayer) return results;

    const highKm = thresholds.high / 1000;
    const moderateKm = thresholds.moderate / 1000;
    const threatened = new Set(); // Track unique features

    fireLayer.eachLayer(fire => {
        const firePoint = fire.feature; 
        if (!firePoint) return;

        targetLayer.eachLayer(target => {
            const targetFeature = target.feature;
            if (!targetFeature) return;

            let evaluationPoint = targetFeature;

            if (targetFeature.geometry.type === 'Polygon' || targetFeature.geometry.type === 'MultiPolygon') {
                evaluationPoint = turf.centroid(targetFeature);
            }

            const distance = turf.distance(firePoint, evaluationPoint, { units: 'kilometers' });
            
            // Track unique features (avoid double-counting)
            const featureId = targetFeature.properties.id || targetFeature.properties.fid || JSON.stringify(targetFeature.geometry.coordinates);
            
            if (distance <= highKm) {
                results.highRisk.push(targetFeature);
                threatened.add(featureId);
            } else if (distance <= moderateKm) {
                results.moderateRisk.push(targetFeature);
                threatened.add(featureId);
            }
        });
    });

    results.total = threatened.size; // Total unique threatened features
    return results;
}

function displayAnalysisResults(resultsData) {
    // Hide the form
    document.querySelector('.initial-options').style.display = 'none';
    
    // Show the results section
    const resultsSection = document.getElementById('description');
    resultsSection.style.display = 'block';
    
    // Show the buttons
    document.getElementById('new_analysis').style.display = 'inline-block';
    document.getElementById('download_data').style.display = 'inline-block';
    
    // Update the overview title
    document.getElementById('overview-title').textContent = `${currentRegion} - Risk Analysis`;
    
    // Update each section
    document.getElementById('admin1').innerHTML = `
        <strong>Analysis Region:</strong> ${currentRegion}<br>
        <strong>Risk Thresholds:</strong><br>
        • High: ${distance_thresholds.high}m<br>
        • Moderate: ${distance_thresholds.moderate}m
    `;
    
    document.getElementById('households').innerHTML = resultsData.households 
        ? `<strong>🏠 Households Threatened:</strong> ${resultsData.households.highRisk.length + resultsData.households.moderateRisk.length}<br>
           <span style="color: #E74C3C;">High Risk: ${resultsData.households.highRisk.length}</span><br>
           <span style="color: #F39C12;">Moderate Risk: ${resultsData.households.moderateRisk.length}</span>`
        : '<strong>🏠 Households:</strong> Not analyzed';
    
    document.getElementById('indigenous_comm').innerHTML = resultsData.indigenous 
        ? `<strong>🌿 Indigenous Communities Threatened:</strong> ${resultsData.indigenous.highRisk.length + resultsData.indigenous.moderateRisk.length}<br>
           <span style="color: #E74C3C;">High Risk: ${resultsData.indigenous.highRisk.length}</span><br>
           <span style="color: #F39C12;">Moderate Risk: ${resultsData.indigenous.moderateRisk.length}</span>`
        : '<strong>🌿 Indigenous Communities:</strong> Not analyzed';
    
    document.getElementById('protected').innerHTML = resultsData.protected 
        ? `<strong>🛡️ Protected Areas Threatened:</strong> ${resultsData.protected.highRisk.length + resultsData.protected.moderateRisk.length}<br>
           <span style="color: #E74C3C;">High Risk: ${resultsData.protected.highRisk.length}</span><br>
           <span style="color: #F39C12;">Moderate Risk: ${resultsData.protected.moderateRisk.length}</span>`
        : '<strong>🛡️ Protected Areas:</strong> Not analyzed';
}

function downloadAnalysisResults(resultsData) {
    // Prepare CSV data
    const csvRows = [];
    
    // Header
    csvRows.push('Category,Total Threatened,High Risk,Moderate Risk');
    
    // Data rows
    if (resultsData.households) {
        csvRows.push(`Households,${resultsData.households.highRisk.length + resultsData.households.moderateRisk.length},${resultsData.households.highRisk.length},${resultsData.households.moderateRisk.length}`);
    }
    
    if (resultsData.indigenous) {
        csvRows.push(`Indigenous Communities,${resultsData.indigenous.highRisk.length + resultsData.indigenous.moderateRisk.length},${resultsData.indigenous.highRisk.length},${resultsData.indigenous.moderateRisk.length}`);
    }
    
    if (resultsData.protected) {
        csvRows.push(`Protected Areas,${resultsData.protected.highRisk.length + resultsData.protected.moderateRisk.length},${resultsData.protected.highRisk.length},${resultsData.protected.moderateRisk.length}`);
    }
    
    // Add metadata
    csvRows.push('');
    csvRows.push('Analysis Parameters');
    csvRows.push(`Region,${currentRegion}`);
    csvRows.push(`High Risk Threshold (m),${distance_thresholds.high}`);
    csvRows.push(`Moderate Risk Threshold (m),${distance_thresholds.moderate}`);
    csvRows.push(`Analysis Date,${new Date().toISOString()}`);
    
    // Create CSV string
    const csvContent = csvRows.join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `wildfire_risk_analysis_${currentRegion}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function runFireAnalysis() {
    console.log("=== Running Fire Analysis ===");
    
    // Clear old analysis layers
    analysisResultsGroup.clearLayers();
    
    // Fetch filtered data
    await fetchFilteredLayerData();
    
    if (!activeLayers.fires) {
        console.warn("No active fires found.");
        alert("No active fires detected in this region.");
        return;
    }

    // Store results for display
    const resultsData = {};

    // Run analysis for each selected layer
    analysis_layers.forEach(layerKey => {
        const lookupKey = layerKey === 'protected_areas' ? 'protected' : layerKey;
        const targets = activeLayers[lookupKey];

        if (!targets) return;

        // Run analysis
        const analysisResults = analyzeFireProximity(activeLayers.fires, targets, distance_thresholds);
        
        // Store results
        resultsData[lookupKey] = analysisResults;
        
        console.log(`Results for ${layerKey}:`, analysisResults);

        // Visualize High Risk features
        if (analysisResults.highRisk.length > 0) {
            L.geoJSON(analysisResults.highRisk, {
                pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 6 }),
                style: {
                    color: "#E74C3C",
                    fillColor: "#E74C3C",
                    fillOpacity: 0.6,
                    weight: 3
                },
                onEachFeature: (feature, layer) => {
                    layer.bindPopup(`<strong>HIGH RISK</strong><br>Layer: ${layerKey}`);
                }
            }).addTo(analysisResultsGroup);
        }

        // Visualize Moderate Risk features
        if (analysisResults.moderateRisk.length > 0) {
            L.geoJSON(analysisResults.moderateRisk, {
                pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 5 }),
                style: {
                    color: "#F39C12",
                    fillColor: "#F39C12",
                    fillOpacity: 0.4,
                    weight: 2
                },
                onEachFeature: (feature, layer) => {
                    layer.bindPopup(`<strong>MODERATE RISK</strong><br>Layer: ${layerKey}`);
                }
            }).addTo(analysisResultsGroup);
        }
    });

    // Display results in sidebar
    displayAnalysisResults(resultsData);
    
    // Store results for download
    latestResults = resultsData;
}

//--------------------------------------------------------------------
// 7. EVENT HANDLERS
//--------------------------------------------------------------------
// Update user inputs when form changes
document.getElementById('analysisForm').addEventListener('change', (e) => {
    analysis_layers = get_analysis_layers();
    distance_thresholds = get_distance_thresholds();
});

// Update region when dropdown changes
const selectRegion = document.getElementById('region');
selectRegion.addEventListener('change', () => {
    currentRegion = get_region();
});

// Run analysis button
const analysisBtn = document.getElementById('analysisBtn');
if (analysisBtn) {
    analysisBtn.addEventListener('click', (e) => {
        e.preventDefault();
        runFireAnalysis();
    });
} else {
    document.getElementById('analysisForm').addEventListener('submit', (e) => {
        e.preventDefault(); 
        runFireAnalysis();
    });
}

// "New Analysis" button - reset to form
document.getElementById('new_analysis').addEventListener('click', () => {
    // Show form
    document.querySelector('.initial-options').style.display = 'block';
    
    // Hide results
    document.getElementById('description').style.display = 'none';
    
    // Clear analysis layers
    analysisResultsGroup.clearLayers();
    
    // Reset form
    document.getElementById('analysisForm').reset();
    analysis_layers = [];
    currentRegion = '';
    latestResults = null;
});

// Download button
document.getElementById('download_data').addEventListener('click', () => {
    if (latestResults) {
        downloadAnalysisResults(latestResults);
    } else {
        alert('No analysis results to download. Please run an analysis first.');
    }
});

//--------------------------------------------------------------------
// 8. INITIALIZE
//--------------------------------------------------------------------
async function initializeMap() {
    // Create custom panes for layer ordering
    map.createPane('adminPane').style.zIndex = 400;
    map.createPane('indigenousPane').style.zIndex = 410;
    map.createPane('protectedPane').style.zIndex = 420;
    map.createPane('householdPane').style.zIndex = 430;
    map.createPane('firePane').style.zIndex = 450;

    // Load initial data
    await fetchChacoBoundaries(); 
    await fetchLiveFires();        

    // Enable interactions on fire pane
    map.getPane('firePane').style.pointerEvents = 'auto';
}

initializeMap();