<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

try {
    // 1. Fetch the data
    // Get the properties (risk_level) and the geometry as GeoJSON
    $sql = "SELECT risk_level, ST_AsGeoJSON(ST_Transform(geometry, 4326)) AS geom FROM risk_surface";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();

    // 2. Initialize the FeatureCollection structure
    $geojson = [
        'type' => 'FeatureCollection',
        'features' => []
    ];

    // 3. Loop through the database rows
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $feature = [
            'type' => 'Feature',
            'geometry' => json_decode($row['geom']), // Convert the DB string back to an object
            'properties' => [
                'risk_level' => $row['risk_level']
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