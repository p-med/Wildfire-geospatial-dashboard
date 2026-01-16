-- Wildfire Risk Mapper Database Schema
-- Author: Paulo Medina
-- Course: MSGIS Spatial Database Systems
-- Date: January 2026


-- ================================
-- Database Creation
-- ================================

CREATE DATABASE IF NOT EXISTS wildfire_db;

USE wildfire_db;

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify PostGIS installation
SELECT PostGIS_Version();

-- ============================================
-- Table: fire_events
-- Description: MODIS active fire detections
-- ============================================

CREATE TABLE fire_events (
    id SERIAL PRIMARY KEY,
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    brightness DECIMAL(6, 2),
    scan DECIMAL(6, 2),
    track DECIMAL(6, 2),
    acq_date DATE NOT NULL,
    acq_time TIME,
    satellite VARCHAR(20),
    confidence INTEGER,
    version VARCHAR(10),
    bright_t31 DECIMAL(6, 2),
    frp DECIMAL(8, 2),
    daynight CHAR(1),
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index
CREATE INDEX idx_fire_events_geom ON fire_events USING GIST(geom);
CREATE INDEX idx_fire_events_date ON fire_events(acq_date);

-- ============================================
-- Table: land_cover
-- Description: Land cover classification data
-- ============================================

CREATE TABLE land_cover (
    id SERIAL PRIMARY KEY,
    land_cover_type VARCHAR(50) NOT NULL,
    description TEXT,
    geom GEOMETRY(Polygon, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index
CREATE INDEX idx_land_cover_geom ON land_cover USING GIST(geom);
CREATE INDEX idx_land_cover_type ON land_cover(land_cover_type);

-- ============================================
-- Table: administrative_boundaries
-- Description: Administrative boundaries (e.g., states, counties)
-- ============================================

CREATE TABLE administrative_boundaries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    admin_level INTEGER,
    geom GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index
CREATE INDEX idx_administrative_boundaries_geom ON administrative_boundaries USING GIST(geom);
CREATE INDEX idx_administrative_boundaries_name ON administrative_boundaries(name);

-- ============================================
-- Table: weather_stations
-- Description: Weather station locations and attributes
-- ============================================

CREATE TABLE weather_stations (
    id SERIAL PRIMARY KEY,
    station_name VARCHAR(100) NOT NULL,
    station_code VARCHAR(20),
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    elevation DECIMAL(8, 2),
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create spatial index
CREATE INDEX idx_weather_stations_geom ON weather_stations USING GIST(geom);
CREATE INDEX idx_weather_stations_name ON weather_stations(station_name);

-- ============================================
-- End of Schema    