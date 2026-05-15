// ----------------------------------------------------------------
// 
//
// Get region from dropdown
export function get_region() {
    const value = region.value;
    return value;
}

// Get analysis layers
export function get_analysis_layers() {
    const selectedLayers = Array.from(
        document.querySelectorAll('input[name="layers[]"]:checked')
    ).map(checkbox => checkbox.value);

    return selectedLayers;
}

// Get distance analysis
export function get_distance_thresholds() {
    return {
        high: Number(document.querySelector('input[name="dist_high"]').value),
        moderate: Number(document.querySelector('input[name="dist_mod"]').value)
    };
}
