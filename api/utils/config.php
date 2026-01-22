<?php
// api/utils/config.php

// 1. Load the Composer autoloader
// We use __DIR__ to navigate relative to THIS file's location
require_once __DIR__ . '/../../vendor/autoload.php';

use Dotenv\Dotenv;

// 2. Initialize Dotenv
// Moving up two levels from api/utils/ to reach the root folder where .env lives
try {
    $dotenv = Dotenv::createImmutable(realpath(__DIR__ . '/../../'));
    $dotenv->load();
} catch (Exception $e) {
    // Log full exception details for internal diagnostics, do not expose to clients
    error_log('Dotenv load failed: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine() . "\n" . $e->getTraceAsString());

    // Send a 500 response with a generic JSON error message
    header('HTTP/1.1 500 Internal Server Error');
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Server configuration error']);
    exit;
}

// 3. Store variables for easy access in other PHP files
$db_config = [
    'host' => $_ENV['DB_HOST'] ?? 'localhost',
    'name' => $_ENV['DB_NAME'] ?? '',
    'user' => $_ENV['DB_USER'] ?? '',
    'pass' => $_ENV['DB_PASS'] ?? '',
    'port' => $_ENV['DB_PORT'] ?? '5432'
];

$mapbox_token = $_ENV['MAPBOX_ACCESS_TOKEN'] ?? null;

// No closing PHP tag here - this prevents accidental newlines at the end of the file