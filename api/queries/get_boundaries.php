<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

// Default action for the file
$action = $_GET['action'] ?? 'get_admin1';

try {
    // This variable will hold whatever data the switch case produces
    $responseData = null;

    switch ($action) {
        // --------------------------------------------------------------------
        // GET ADMIN 1 FUNCTION
        // --------------------------------------------------------------------

        case "get_admin1":

            // 1. Fetch the data
            // Get the properties (risk_level) and the geometry as GeoJSON
            $sql = <<<EOD
            SELECT 
              c."ADM1_NAME",
              ROUND((SUM(CASE WHEN f.risk_level = 4 THEN ST_Area(f.geometry) ELSE 0 END) / 10000)::numeric, 0) AS high_risk_area_ha,
              ROUND((SUM(CASE WHEN f.risk_level = 3 THEN ST_Area(f.geometry) ELSE 0 END) / 10000)::numeric, 0) AS moderate_risk_area_ha,
              ROUND((SUM(CASE WHEN f.risk_level = 2 THEN ST_Area(f.geometry) ELSE 0 END) / 10000)::numeric, 0) AS low_risk_area_ha,
              ROUND((SUM(CASE WHEN f.risk_level = 1 THEN ST_Area(f.geometry) ELSE 0 END) / 10000)::numeric, 0) AS no_risk_area_ha,
              ST_AsGeoJSON(ST_Transform(c.geometry, 4326)) AS geom 
            FROM chaco_boundaries AS c
            JOIN risk_surface AS f
            ON ST_Contains(c.geometry, f.geometry)
            GROUP BY c."ADM1_NAME", c.geometry
            EOD;

            $stmt = $pdo->prepare($sql);

            $stmt->execute();

            // 2. Initialize the FeatureCollection structure
            $geojson = [
                'type' => 'FeatureCollection',
                'features' => []
            ];

            // Initialize extra variables for dashboard
            $max_high_risk = -1;
            $top_region = "";
            $total_chaco_risk = 0;
            $max_percent = 0;

            // Prepare the arrays for Chart.js
            $chartLabels = [];
            $chartData = [];

            // 3. Loop through the database rows
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                // Get values for overview
                $current_high = (float)$row['high_risk_area_ha'];
                $total_chaco_risk += $current_high;

                // Track the region with the most fire risk
                if ($current_high > $max_high_risk) {
                    $max_high_risk = $current_high;
                    $top_region = $row['ADM1_NAME'];
                }
                // Create GeoJSON
                $name = $row['ADM1_NAME'];
                $high = $row['high_risk_area_ha'];
                $mod = $row['moderate_risk_area_ha'];
                $low = $row['low_risk_area_ha'];
                $no_risk = $row['no_risk_area_ha'];

                // Popup content
                $popup = 'The region ' . $name . ' has <strong>' . number_format($high) .
                    '</strong> hectares with <strong>high degree</strong> of wildfire and <strong>' .
                    number_format($mod) . '</strong> hectares of <strong>moderate risk</strong>.<br>' .
                    '<button class="popup_button" id="more_info" data-region="' . $name . '"><span>See More</span></button>';
                // Final feature
                $feature = [
                    'type' => 'Feature',
                    'geometry' => json_decode($row['geom']), // Convert the DB string back to an object
                    'properties' => [
                        'Name' => $name,
                        'H_Risk_area_ha' => $high,
                        'M_Risk_area_ha' => $mod,
                        'L_Risk_area_ha' => $low,
                        'N_Risk_area_ha' => $no_risk,
                        'popupContent' => $popup,
                    ]
                ];

                // Add this feature to our collection
                $geojson['features'][] = $feature;
            }

            if ($total_chaco_risk > 0) {
                $max_percent = ($max_high_risk / $total_chaco_risk) * 100;
            }

            // 4. Output the final GeoJSON and Overview variables
            $responseData = [
                'summary' => [
                    'total_risk_ha' => $total_chaco_risk,
                    'top_region_name' => $top_region,
                    'top_region_val' => $max_high_risk,
                    'max_percent' => $max_percent
                ],
                'geojson' => $geojson
            ];

            break; //End the script here
        // --------------------------------------------------------------------
        // GET ADMIN 2 FUNCTION
        // --------------------------------------------------------------------
        case "get_admin2":
            $regionName = $_GET['region'] ?? null; // Get the region sent by JS

            if (!$regionName) {
                throw new Exception("Region name is required for Admin 2 data.");
            }

            // 1. SQL Statement
            $sql = <<<EOD
                    WITH target_dept AS (
                        -- Step 1: Get the polygon for the selected department
                        SELECT geometry FROM chaco_boundaries WHERE "ADM1_NAME" = :region
                    )
                    SELECT 
                        d."ADM2_ES" AS "Name",
                        ROUND((SUM(CASE WHEN f.risk_level = 4 THEN ST_Area(f.geometry) ELSE 0 END) / 10000)::numeric, 0) AS high_risk_area_ha,
                        ROUND((SUM(CASE WHEN f.risk_level = 3 THEN ST_Area(f.geometry) ELSE 0 END) / 10000)::numeric, 0) AS moderate_risk_area_ha,
                        ST_AsGeoJSON(ST_Transform(d.geometry, 4326)) AS geom
                    FROM chaco_districts AS d
                    JOIN target_dept ON ST_Intersects(d.geometry, target_dept.geometry) -- Spatial filter
                    JOIN risk_surface AS f ON ST_Intersects(d.geometry, f.geometry)     -- Risk filter
                    WHERE (ST_Area(ST_Intersection(d.geometry, target_dept.geometry)) / ST_Area(d.geometry)) > 0.5
                    GROUP BY d."ADM2_ES", d.geometry
                    EOD;

            // 2. Prepare the statement
            $stmt = $pdo->prepare($sql);

            // 3. Assign the value and run the query in one step
            $stmt->execute([':region' => $regionName]);

            // 2. Initialize the FeatureCollection structure
            $geojson = [
                'type' => 'FeatureCollection',
                'features' => []
            ];

            // Initialize extra variables for dashboard
            $max_high_risk = -1;
            $top_region = "";
            $total_chaco_risk = 0;

            // Prepare the arrays for Chart.js
            $chartLabels = [];
            $chartData = [];

            // 3. Loop through the database rows
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                // Get values for overview
                $current_high = (float)$row['high_risk_area_ha'];
                $total_chaco_risk += $current_high;

                // Track the region with the most fire risk
                if ($current_high > $max_high_risk) {
                    $max_high_risk = $current_high;
                    $top_region = $row['Name'];
                }
                // Create GeoJSON
                $name = $row['Name'];
                $high = $row['high_risk_area_ha'];
                $mod = $row['moderate_risk_area_ha'];
                $popup = 'The region ' . $name . ' has <strong>' . number_format($high) .
                    '</strong> hectares with <strong>high degree</strong> of wildfire and <strong>' .
                    number_format($mod) . '</strong> hectares of <strong>moderate risk</strong>.<br>' .
                    '<button class="popup_button" id="more_info" data-region="' . $name . '"><span>See More</span></button>';
                $feature = [
                    'type' => 'Feature',
                    'geometry' => json_decode($row['geom']), // Convert the DB string back to an object
                    'properties' => [
                        'Name' => $name,
                        'H_Risk_area_ha' => $high,
                        'M_Risk_area_ha' => $mod,
                        'popupContent' => $popup
                    ]
                ];

                // Add this feature to our collection
                $geojson['features'][] = $feature;
            }

            // Get MAx percentage
            if ($total_chaco_risk > 0) {
                $max_percent = ($max_high_risk / $total_chaco_risk) * 100;
            }

            // 4. Output the final GeoJSON and Overview variables
            $responseData = [
                'summary' => [
                    'total_risk_ha' => $total_chaco_risk,
                    'top_region_name' => $top_region,
                    'top_region_val' => $max_high_risk,
                    'max_percent' => $max_percent
                ],
                'geojson' => $geojson
            ];

            break; //End the script here
    }

    // 3. One single output point for the whole file
    if ($responseData) {
        echo json_encode($responseData);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
