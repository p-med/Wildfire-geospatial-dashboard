<?php
require_once 'config.php';

header('Content-Type: application/json');

$token = getenv('MAPBOX_ACCESS_TOKEN') ?: ($_ENV['MAPBOX_ACCESS_TOKEN'] ?? null);

if (empty($token)) {
    http_response_code(500);
    echo json_encode(['error' => 'Map configuration not available']);
    exit;
}

echo json_encode([
    // 'mapboxToken' => $_ENV['MAPBOX_ACCESS_TOKEN']
    'mapboxToken' => $token
]);