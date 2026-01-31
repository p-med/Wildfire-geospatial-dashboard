<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

try {
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

    // 3. Loop through the database rows
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $name = $row['ADM1_NAME'];
        $high = $row['high_risk_area_ha'];
        $mod = $row['moderate_risk_area_ha'];
        $popup = 'The region ' . $name . ' has <strong>' . number_format($high) . 
        '</strong> hectares with <strong>high degree</strong> of wildfire and <strong>' . 
        number_format($mod) .'</strong> hectares of <strong>moderate risk</strong>.<br>' .
        '<button class="popup_button" id="more_info"><span>See More</span></button>';
        $feature = [
            'type' => 'Feature',
            'geometry' => json_decode($row['geom']), // Convert the DB string back to an object
            'properties' => [
                'Name' => $name,
                'H_Risk_area_ha' => $high,
                'M_Risk_area_ha' => $mod,
                'L_Risk_area_ha' => $row['low_risk_area_ha'],
                'N_Risk_area_ha' => $row['no_risk_area_ha'],
                'popupContent' => $popup
            ]
        ];

        // Add this feature to our collection
        $geojson['features'][] = $feature;
    }

    // 4. Output the final GeoJSON
    echo json_encode($geojson);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}