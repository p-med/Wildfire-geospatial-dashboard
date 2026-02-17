<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

// -----------------------------------------------------------------------------------------------
// Parameters
// -----------------------------------------------------------------------------------------------

$region = $_GET['region'];
$layers = $_GET['layers'] ?? []; // Array of selected checkboxes
$distHigh = (int)$_GET['dist_high'];
$distMod = (int)$_GET['dist_mod'];

$responseData = [];

// -----------------------------------------------------------------------------------------------
// Build functions
// -----------------------------------------------------------------------------------------------

// 1. Get households layers
function getHouseholds($pdo, $region, $dHigh, $dMod)
{
    // Household tables
    $tables = [
        "Alto Paraguay" => "ap_households",
        "Boqueron" => "boq_households",
        "Presidente Hayes" => "pa_households"
    ];
    // Selected region's households
    $tableName = $tables[$region];

    // 1. Calling the function saved in db. Check database/functions.sql
    $sql = "SELECT * FROM get_household_risk(?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$tableName, $dHigh, $dMod]);

    // 2. Initialize variables
    // 2.1. Initialize the FeatureCollection structure
    $geojson = [
        'type' => 'FeatureCollection',
        'features' => []
    ];

    // 2.2. Initialize summary variables
    $total_risk_hh = 0;
    $total_houses = 0;

    // 3. Process results into GeoJSON
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {

        // Variables
        $risk_class = $row['risk_class'];
        $geom = $row['geom'];

        // Summary
        if ($risk_class == "High") {
            $total_risk_hh += 1;
        }

        $total_houses += 1;


        // Feature
        $feature = [
            'type' => 'Feature',
            'geometry' => json_decode($geom), // Convert the DB string back to an object
            'properties' => [
                'risk_class' => $risk_class
            ]
        ];

        // Add this feature to our collection
        $geojson['features'][] = $feature;
    }

    $percent_at_risk = ($total_risk_hh / $total_houses) * 100;
    $side_pane_content = "There are <b>" . number_format($total_risk_hh) . "</b> houses at high risk in " .
        $region . " representing <b>" . number_format($percent_at_risk, 2) .
        "%</b> of all the households in the region.";

    $responseData = [
        'summary' => [
            'content' => $side_pane_content,
        ],
        'geojson' => $geojson
    ];

    return $responseData;
}

// 2. Get indigenous layers

function getIndigenous($pdo, $region, $dHigh, $dMod)
{
    // 1. Calling the function saved in db. Check database/functions.sql
    $sql = "SELECT * FROM get_ind_comm_risk(?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$region, $dHigh, $dMod]);

    // Initialize variables
    // 2.1. Initialize the FeatureCollection structure
    $geojson = [
        'type' => 'FeatureCollection',
        'features' => []
    ];

    // 2.2. Variables
    $total_high_risk_comm = 0;
    $tot_comm = 0;

    // 3. Process results into GeoJSON
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Variables
        $risk_class = $row['risk_class'];
        $geom = $row['geom'];

        // Summary
        if ($risk_class == "High") {
            $total_high_risk_comm += 1;
        }

        $tot_comm += 1;

        // Feature
        $feature = [
            'type' => 'Feature',
            'geometry' => json_decode($geom), // Convert the DB string back to an object
            'properties' => [
                'risk_class' => $risk_class
            ]
        ];

        // Add this feature to our collection
        $geojson['features'][] = $feature;
    }

    $percent_at_risk = ($total_high_risk_comm / $tot_comm) * 100;

    $side_pane_content = "There are <b>" . number_format($total_high_risk_comm) . "</b> communities at high risk in " .
        $region . " representing <b>" . number_format($percent_at_risk, 2) .
        "%</b> of all the communities in the region.";

    $responseData = [
        'summary' => [
            'content' => $side_pane_content,
        ],
        'geojson' => $geojson
    ];

    return $responseData;
}

// 3. Get Protected Areas

function getProtectedAreas($pdo, $region, $dHigh, $dMod)
{
    // 1. Calling the function saved in db. Check database/functions.sql
    $sql = "SELECT * FROM get_pa_risk(?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$region, $dHigh, $dMod]);

    // 2.1 Initialize the FeatureCollection structure
    $geojson = [
        'type' => 'FeatureCollection',
        'features' => []
    ];

    // 2.2 Summary Variables
    $tot_protected = 0;
    $tot_high_risk_protected = 0;

    // 3. Process results into GeoJSON
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Variables
        $risk_class = $row['risk_class'];
        $geom = $row['geom'];

        // Summary
        if ($risk_class == "High") {
            $tot_high_risk_protected += 1;
        }

        $tot_protected += 1;

        // Feature
        $feature = [
            'type' => 'Feature',
            'geometry' => json_decode($geom), // Convert the DB string back to an object
            'properties' => [
                'risk_class' => $risk_class
            ]
        ];

        // Add this feature to our collection
        $geojson['features'][] = $feature;
    }

    $percent_at_risk = ($tot_high_risk_protected / $tot_protected) * 100;

    $side_pane_content = "There are <b>" . number_format($tot_high_risk_protected) . "</b> national protected areas at high risk in " .
        $region . " representing <b>" . number_format($percent_at_risk, 2) .
        "%</b> of all the reserves in the region.";

    $responseData = [
        'summary' => [
            'content' => $side_pane_content,
        ],
        'geojson' => $geojson
    ];

    return $responseData;
}

// 4. Get admin 1
function getAdmin1($pdo, $region)
{
    // 1. Calling the function saved in db. Check database/functions.sql
    $sql = "SELECT * FROM get_admin1(?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$region]);

    // 2. Initialize the FeatureCollection structure
    $geojson = [
        'type' => 'FeatureCollection',
        'features' => []
    ];

    $content = "";
    // 3. Process results into GeoJSON
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Variables
        $high_risk_area_ha = $row['high_risk_area_ha'];
        $moderate_risk_area_ha = $row['moderate_risk_area_ha'];
        $no_risk_area_ha = $row['no_risk_area_ha'];
        $geom = $row['geom'];

        // Pop up
        $content = 'The region ' . $region . ' has <strong>' . number_format($high_risk_area_ha) .
            '</strong> hectares with <strong>high to moderate degree</strong> of wildfire risk and <strong>' .
            number_format($moderate_risk_area_ha) . '</strong> hectares of <strong>moderate risk</strong>.<br>';

        // Feature
        $feature = [
            'type' => 'Feature',
            'geometry' => json_decode($geom), // Convert the DB string back to an object
            'properties' => [
                'high_risk_area_ha' => $high_risk_area_ha,
                'moderate_risk_area_ha' => $moderate_risk_area_ha,
                'no_risk_area_ha' => $no_risk_area_ha,
                'content' => $content
            ]
        ];

        // Add this feature to our collection
        $geojson['features'][] = $feature;
    }

    $responseData = [
        'summary' => [
            'content' => $content,
        ],
        'geojson' => $geojson
    ];

    return $responseData;
}

// -----------------------------------------------------------------------------------------------
// Execute Functions
// -----------------------------------------------------------------------------------------------
try {
    // 1. Load selected region
    $responseData['admin1'] = getAdmin1($pdo, $region);

    // 2. Load analysis layers
    foreach ($layers as $layer) {
        switch ($layer) {
            case 'households':
                $responseData['households'] = getHouseholds($pdo, $region, $distHigh, $distMod);
                break;
            case 'indigenous':
                $responseData['indigenous'] = getIndigenous($pdo, $region, $distHigh, $distMod);
                break;
            case 'protected_areas':
                $responseData['protected_areas'] = getProtectedAreas($pdo, $region, $distHigh, $distMod);
                break;
        }
    }

    // 3. One single output point for the whole file
    if ($responseData) {
        echo json_encode($responseData);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
