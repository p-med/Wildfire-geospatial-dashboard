<?php
require_once __DIR__ . '/../utils/config.php'; // Connect to config file

// Get login variables from config file
$host = $db_config['host'];
$user = $db_config['user'];
$password = $db_config['pass'];
$dbname = $db_config['name'];
$port = $db_config['port'];

try {
    // Construct the DSN string
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;user=$user;password=$password";
    
    // Create a new PDO instance
    $pdo = new PDO($dsn);
    
    // Set error mode to exception for better error handling
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connected to PostgreSQL with PDO successfully!";

} catch (PDOException $e) {
    // Handle connection errors
    echo "Connection failed: " . $e->getMessage();
}
// The connection is automatically closed when the script ends or the PDO object is unset.
