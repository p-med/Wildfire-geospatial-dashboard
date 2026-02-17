-- Wildfire Risk Mapper Database Schema
-- Author: Paulo Medina
-- Course: MSGIS Spatial Database Systems
-- Date: January 2026


-- ================================
-- PostGIS Setup
-- ================================

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify PostGIS installation
SELECT PostGIS_Version();

-- ================================
-- Table Definitions
-- ================================


-- User-Submitted Fire Reports
CREATE TABLE report_fire (
    report_id SERIAL PRIMARY KEY,
    reported_by TEXT,
    report_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fire_date DATE NOT NULL,
    fire_time TIME,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    description TEXT,
    intensity TEXT CHECK (intensity IN ('low', 'medium', 'high')),
    verified BOOLEAN DEFAULT FALSE,
    geometry GEOMETRY(POINT, 32720),
    CONSTRAINT valid_coords CHECK (
        latitude BETWEEN -28 AND -19 AND 
        longitude BETWEEN -63 AND -54
    )
);

CREATE INDEX idx_report_fire_geom ON report_fire USING GIST(geometry);
CREATE INDEX idx_report_fire_date ON report_fire(fire_date DESC);
CREATE INDEX idx_report_fire_verified ON report_fire(verified);

-- Auto-generate geometry from lat/lon
CREATE OR REPLACE FUNCTION update_report_fire_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geometry = ST_Transform(
        ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326),
        32720
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_report_fire_geom
BEFORE INSERT OR UPDATE ON report_fire
FOR EACH ROW
EXECUTE FUNCTION update_report_fire_geom();

-- ===============================
-- Geospatial Data Tables
-- ===============================

-- Chaco Boundaries
CREATE TABLE chaco_boundaries (
    chaco_boundaries_id SERIAL PRIMARY KEY,
    ADM1_CODE INTEGER,
    ADM1_NAME TEXT,
    area_km2 DOUBLE PRECISION,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_chaco_boundaries_geom ON chaco_boundaries USING GIST(geometry);


-- Chaco Districts
CREATE TABLE chaco_districts (
    chaco_districts_id SERIAL PRIMARY KEY,
    ADM0_ES TEXT,
    ADM0_PCODE TEXT,
    ADM1_ES TEXT,
    ADM1_PCODE TEXT,
    ADM2_ES TEXT,
    ADM2_PCODE TEXT,
    geometry GEOMETRY(MULTIPOLYGON, 32720)
);
CREATE INDEX idx_chaco_districts_geom ON chaco_districts USING GIST(geometry);


-- Fire Events
CREATE TABLE fire_events (
    fire_events_id SERIAL PRIMARY KEY,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    acq_date TIMESTAMP,
    bright_t31 DOUBLE PRECISION,
    brightness DOUBLE PRECISION,
    confidence INTEGER,
    track DOUBLE PRECISION,
    instrument TEXT,
    scan DOUBLE PRECISION,
    satellite TEXT,
    geometry GEOMETRY(POINT, 32720)
);
CREATE INDEX idx_fire_events_geom ON fire_events USING GIST(geometry);


-- Chaco Roads
CREATE TABLE chaco_roads (
    chaco_roads_id SERIAL PRIMARY KEY,
    NOMBRE TEXT,
    TIPO_VIA TEXT,
    DesTipoVia TEXT,
    DesRodaVia TEXT,
    geometry GEOMETRY(LINESTRING, 32720)
);
CREATE INDEX idx_chaco_roads_geom ON chaco_roads USING GIST(geometry);


-- Chaco Rivers
CREATE TABLE chaco_rivers (
    chaco_rivers_id SERIAL PRIMARY KEY,
    NOMBRE TEXT,
    geometry GEOMETRY(MULTILINESTRING, 32720)
);
CREATE INDEX idx_chaco_rivers_geom ON chaco_rivers USING GIST(geometry);


-- Chaco Protected Areas
CREATE TABLE chaco_protected_areas (
    chaco_protected_areas_id SERIAL PRIMARY KEY,
    NAME_ENG TEXT,
    NAME TEXT,
    DESIG TEXT,
    DESIG_ENG TEXT,
    DESIG_TYPE TEXT,
    IUCN_CAT TEXT,
    INT_CRIT TEXT,
    REALM TEXT,
    REP_M_AREA DOUBLE PRECISION,
    REP_AREA DOUBLE PRECISION,
    GIS_AREA DOUBLE PRECISION,
    NO_TAKE TEXT,
    NO_TK_AREA DOUBLE PRECISION,
    GOV_TYPE TEXT,
    GOVSUBTYPE TEXT,
    OWN_TYPE TEXT,
    OWNSUBTYPE TEXT,
    MANG_AUTH TEXT,
    ISO3 TEXT,
    SUPP_INFO TEXT,
    CONS_OBJ TEXT,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_chaco_protected_areas_geom ON chaco_protected_areas USING GIST(geometry);


-- Risk Surface
CREATE TABLE risk_surface (
    risk_surface_id SERIAL PRIMARY KEY,
    id TEXT,
    count INTEGER,
    risk_level INTEGER,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_risk_surface_geom ON risk_surface USING GIST(geometry);


-- Chaco Boundaries
CREATE TABLE chaco_boundaries (
    chaco_boundaries_id SERIAL PRIMARY KEY,
    ADM1_CODE INTEGER,
    ADM1_NAME TEXT,
    area_km2 DOUBLE PRECISION,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_chaco_boundaries_geom ON chaco_boundaries USING GIST(geometry);


-- Chaco Districts
CREATE TABLE chaco_districts (
    chaco_districts_id SERIAL PRIMARY KEY,
    ADM0_ES TEXT,
    ADM0_PCODE TEXT,
    ADM1_ES TEXT,
    ADM1_PCODE TEXT,
    ADM2_ES TEXT,
    ADM2_PCODE TEXT,
    geometry GEOMETRY(MULTIPOLYGON, 32720)
);
CREATE INDEX idx_chaco_districts_geom ON chaco_districts USING GIST(geometry);


-- Fire Events
CREATE TABLE fire_events (
    fire_events_id SERIAL PRIMARY KEY,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    acq_date TIMESTAMP,
    bright_t31 DOUBLE PRECISION,
    brightness DOUBLE PRECISION,
    confidence INTEGER,
    track DOUBLE PRECISION,
    instrument TEXT,
    scan DOUBLE PRECISION,
    satellite TEXT,
    geometry GEOMETRY(POINT, 32720)
);
CREATE INDEX idx_fire_events_geom ON fire_events USING GIST(geometry);


-- Chaco Roads
CREATE TABLE chaco_roads (
    chaco_roads_id SERIAL PRIMARY KEY,
    NOMBRE TEXT,
    TIPO_VIA TEXT,
    DesTipoVia TEXT,
    DesRodaVia TEXT,
    geometry GEOMETRY(LINESTRING, 32720)
);
CREATE INDEX idx_chaco_roads_geom ON chaco_roads USING GIST(geometry);


-- Chaco Rivers
CREATE TABLE chaco_rivers (
    chaco_rivers_id SERIAL PRIMARY KEY,
    NOMBRE TEXT,
    geometry GEOMETRY(MULTILINESTRING, 32720)
);
CREATE INDEX idx_chaco_rivers_geom ON chaco_rivers USING GIST(geometry);


-- Chaco Protected Areas
CREATE TABLE chaco_protected_areas (
    chaco_protected_areas_id SERIAL PRIMARY KEY,
    NAME_ENG TEXT,
    NAME TEXT,
    DESIG TEXT,
    DESIG_ENG TEXT,
    DESIG_TYPE TEXT,
    IUCN_CAT TEXT,
    INT_CRIT TEXT,
    REALM TEXT,
    REP_M_AREA DOUBLE PRECISION,
    REP_AREA DOUBLE PRECISION,
    GIS_AREA DOUBLE PRECISION,
    NO_TAKE TEXT,
    NO_TK_AREA DOUBLE PRECISION,
    GOV_TYPE TEXT,
    GOVSUBTYPE TEXT,
    OWN_TYPE TEXT,
    OWNSUBTYPE TEXT,
    MANG_AUTH TEXT,
    ISO3 TEXT,
    SUPP_INFO TEXT,
    CONS_OBJ TEXT,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_chaco_protected_areas_geom ON chaco_protected_areas USING GIST(geometry);


-- Risk Surface
CREATE TABLE risk_surface (
    risk_surface_id SERIAL PRIMARY KEY,
    id TEXT,
    count INTEGER,
    risk_level INTEGER,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_risk_surface_geom ON risk_surface USING GIST(geometry);


-- Chaco Boundaries
CREATE TABLE chaco_boundaries (
    chaco_boundaries_id SERIAL PRIMARY KEY,
    ADM1_CODE INTEGER,
    ADM1_NAME TEXT,
    area_km2 DOUBLE PRECISION,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_chaco_boundaries_geom ON chaco_boundaries USING GIST(geometry);


-- Chaco Districts
CREATE TABLE chaco_districts (
    chaco_districts_id SERIAL PRIMARY KEY,
    ADM0_ES TEXT,
    ADM0_PCODE TEXT,
    ADM1_ES TEXT,
    ADM1_PCODE TEXT,
    ADM2_ES TEXT,
    ADM2_PCODE TEXT,
    geometry GEOMETRY(MULTIPOLYGON, 32720)
);
CREATE INDEX idx_chaco_districts_geom ON chaco_districts USING GIST(geometry);


-- Fire Events
CREATE TABLE fire_events (
    fire_events_id SERIAL PRIMARY KEY,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    acq_date TIMESTAMP,
    bright_t31 DOUBLE PRECISION,
    brightness DOUBLE PRECISION,
    confidence INTEGER,
    track DOUBLE PRECISION,
    instrument TEXT,
    scan DOUBLE PRECISION,
    satellite TEXT,
    geometry GEOMETRY(POINT, 32720)
);
CREATE INDEX idx_fire_events_geom ON fire_events USING GIST(geometry);


-- Chaco Roads
CREATE TABLE chaco_roads (
    chaco_roads_id SERIAL PRIMARY KEY,
    NOMBRE TEXT,
    TIPO_VIA TEXT,
    DesTipoVia TEXT,
    DesRodaVia TEXT,
    geometry GEOMETRY(LINESTRING, 32720)
);
CREATE INDEX idx_chaco_roads_geom ON chaco_roads USING GIST(geometry);


-- Chaco Rivers
CREATE TABLE chaco_rivers (
    chaco_rivers_id SERIAL PRIMARY KEY,
    NOMBRE TEXT,
    geometry GEOMETRY(MULTILINESTRING, 32720)
);
CREATE INDEX idx_chaco_rivers_geom ON chaco_rivers USING GIST(geometry);


-- Chaco Protected Areas
CREATE TABLE chaco_protected_areas (
    chaco_protected_areas_id SERIAL PRIMARY KEY,
    NAME_ENG TEXT,
    NAME TEXT,
    DESIG TEXT,
    DESIG_ENG TEXT,
    DESIG_TYPE TEXT,
    IUCN_CAT TEXT,
    INT_CRIT TEXT,
    REALM TEXT,
    REP_M_AREA DOUBLE PRECISION,
    REP_AREA DOUBLE PRECISION,
    GIS_AREA DOUBLE PRECISION,
    NO_TAKE TEXT,
    NO_TK_AREA DOUBLE PRECISION,
    GOV_TYPE TEXT,
    GOVSUBTYPE TEXT,
    OWN_TYPE TEXT,
    OWNSUBTYPE TEXT,
    MANG_AUTH TEXT,
    ISO3 TEXT,
    SUPP_INFO TEXT,
    CONS_OBJ TEXT,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_chaco_protected_areas_geom ON chaco_protected_areas USING GIST(geometry);


-- Risk Surface
CREATE TABLE risk_surface (
    risk_surface_id SERIAL PRIMARY KEY,
    id TEXT,
    count INTEGER,
    risk_level INTEGER,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_risk_surface_geom ON risk_surface USING GIST(geometry);


-- Chaco Boundaries
CREATE TABLE chaco_boundaries (
    chaco_boundaries_id SERIAL PRIMARY KEY,
    ADM1_CODE INTEGER,
    ADM1_NAME TEXT,
    area_km2 DOUBLE PRECISION,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_chaco_boundaries_geom ON chaco_boundaries USING GIST(geometry);


-- Chaco Districts
CREATE TABLE chaco_districts (
    chaco_districts_id SERIAL PRIMARY KEY,
    ADM0_ES TEXT,
    ADM0_PCODE TEXT,
    ADM1_ES TEXT,
    ADM1_PCODE TEXT,
    ADM2_ES TEXT,
    ADM2_PCODE TEXT,
    geometry GEOMETRY(MULTIPOLYGON, 32720)
);
CREATE INDEX idx_chaco_districts_geom ON chaco_districts USING GIST(geometry);


-- Fire Events
CREATE TABLE fire_events (
    fire_events_id SERIAL PRIMARY KEY,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    acq_date TIMESTAMP,
    bright_t31 DOUBLE PRECISION,
    brightness DOUBLE PRECISION,
    confidence INTEGER,
    track DOUBLE PRECISION,
    instrument TEXT,
    scan DOUBLE PRECISION,
    satellite TEXT,
    geometry GEOMETRY(POINT, 32720)
);
CREATE INDEX idx_fire_events_geom ON fire_events USING GIST(geometry);


-- Chaco Roads
CREATE TABLE chaco_roads (
    chaco_roads_id SERIAL PRIMARY KEY,
    NOMBRE TEXT,
    TIPO_VIA TEXT,
    DesTipoVia TEXT,
    DesRodaVia TEXT,
    geometry GEOMETRY(LINESTRING, 32720)
);
CREATE INDEX idx_chaco_roads_geom ON chaco_roads USING GIST(geometry);


-- Chaco Rivers
CREATE TABLE chaco_rivers (
    chaco_rivers_id SERIAL PRIMARY KEY,
    NOMBRE TEXT,
    geometry GEOMETRY(MULTILINESTRING, 32720)
);
CREATE INDEX idx_chaco_rivers_geom ON chaco_rivers USING GIST(geometry);


-- Chaco Protected Areas
CREATE TABLE chaco_protected_areas (
    chaco_protected_areas_id SERIAL PRIMARY KEY,
    NAME_ENG TEXT,
    NAME TEXT,
    DESIG TEXT,
    DESIG_ENG TEXT,
    DESIG_TYPE TEXT,
    IUCN_CAT TEXT,
    INT_CRIT TEXT,
    REALM TEXT,
    REP_M_AREA DOUBLE PRECISION,
    REP_AREA DOUBLE PRECISION,
    GIS_AREA DOUBLE PRECISION,
    NO_TAKE TEXT,
    NO_TK_AREA DOUBLE PRECISION,
    GOV_TYPE TEXT,
    GOVSUBTYPE TEXT,
    OWN_TYPE TEXT,
    OWNSUBTYPE TEXT,
    MANG_AUTH TEXT,
    ISO3 TEXT,
    SUPP_INFO TEXT,
    CONS_OBJ TEXT,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_chaco_protected_areas_geom ON chaco_protected_areas USING GIST(geometry);


-- Risk Surface
CREATE TABLE risk_surface (
    risk_surface_id SERIAL PRIMARY KEY,
    id TEXT,
    count INTEGER,
    risk_level INTEGER,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_risk_surface_geom ON risk_surface USING GIST(geometry);


-- Chaco Boundaries
CREATE TABLE chaco_boundaries (
    chaco_boundaries_id SERIAL PRIMARY KEY,
    ADM1_CODE INTEGER,
    ADM1_NAME TEXT,
    area_km2 DOUBLE PRECISION,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_chaco_boundaries_geom ON chaco_boundaries USING GIST(geometry);


-- Chaco Districts
CREATE TABLE chaco_districts (
    chaco_districts_id SERIAL PRIMARY KEY,
    ADM0_ES TEXT,
    ADM0_PCODE TEXT,
    ADM1_ES TEXT,
    ADM1_PCODE TEXT,
    ADM2_ES TEXT,
    ADM2_PCODE TEXT,
    geometry GEOMETRY(MULTIPOLYGON, 32720)
);
CREATE INDEX idx_chaco_districts_geom ON chaco_districts USING GIST(geometry);


-- Fire Events
CREATE TABLE fire_events (
    fire_events_id SERIAL PRIMARY KEY,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    acq_date TIMESTAMP,
    bright_t31 DOUBLE PRECISION,
    brightness DOUBLE PRECISION,
    confidence INTEGER,
    track DOUBLE PRECISION,
    instrument TEXT,
    scan DOUBLE PRECISION,
    satellite TEXT,
    geometry GEOMETRY(POINT, 32720)
);
CREATE INDEX idx_fire_events_geom ON fire_events USING GIST(geometry);


-- Chaco Roads
CREATE TABLE chaco_roads (
    chaco_roads_id SERIAL PRIMARY KEY,
    NOMBRE TEXT,
    TIPO_VIA TEXT,
    DesTipoVia TEXT,
    DesRodaVia TEXT,
    geometry GEOMETRY(LINESTRING, 32720)
);
CREATE INDEX idx_chaco_roads_geom ON chaco_roads USING GIST(geometry);


-- Chaco Rivers
CREATE TABLE chaco_rivers (
    chaco_rivers_id SERIAL PRIMARY KEY,
    NOMBRE TEXT,
    geometry GEOMETRY(MULTILINESTRING, 32720)
);
CREATE INDEX idx_chaco_rivers_geom ON chaco_rivers USING GIST(geometry);


-- Chaco Protected Areas
CREATE TABLE chaco_protected_areas (
    chaco_protected_areas_id SERIAL PRIMARY KEY,
    NAME_ENG TEXT,
    NAME TEXT,
    DESIG TEXT,
    DESIG_ENG TEXT,
    DESIG_TYPE TEXT,
    IUCN_CAT TEXT,
    INT_CRIT TEXT,
    REALM TEXT,
    REP_M_AREA DOUBLE PRECISION,
    REP_AREA DOUBLE PRECISION,
    GIS_AREA DOUBLE PRECISION,
    NO_TAKE TEXT,
    NO_TK_AREA DOUBLE PRECISION,
    GOV_TYPE TEXT,
    GOVSUBTYPE TEXT,
    OWN_TYPE TEXT,
    OWNSUBTYPE TEXT,
    MANG_AUTH TEXT,
    ISO3 TEXT,
    SUPP_INFO TEXT,
    CONS_OBJ TEXT,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_chaco_protected_areas_geom ON chaco_protected_areas USING GIST(geometry);


-- Risk Surface
CREATE TABLE risk_surface (
    risk_surface_id SERIAL PRIMARY KEY,
    id TEXT,
    count INTEGER,
    risk_level INTEGER,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_risk_surface_geom ON risk_surface USING GIST(geometry);


-- Chaco Boundaries
CREATE TABLE chaco_boundaries (
    chaco_boundaries_id SERIAL PRIMARY KEY,
    ADM1_CODE INTEGER,
    ADM1_NAME TEXT,
    area_km2 DOUBLE PRECISION,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_chaco_boundaries_geom ON chaco_boundaries USING GIST(geometry);


-- Chaco Districts
CREATE TABLE chaco_districts (
    chaco_districts_id SERIAL PRIMARY KEY,
    ADM0_ES TEXT,
    ADM0_PCODE TEXT,
    ADM1_ES TEXT,
    ADM1_PCODE TEXT,
    ADM2_ES TEXT,
    ADM2_PCODE TEXT,
    geometry GEOMETRY(MULTIPOLYGON, 32720)
);
CREATE INDEX idx_chaco_districts_geom ON chaco_districts USING GIST(geometry);


-- Fire Events
CREATE TABLE fire_events (
    fire_events_id SERIAL PRIMARY KEY,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    acq_date TIMESTAMP,
    bright_t31 DOUBLE PRECISION,
    brightness DOUBLE PRECISION,
    confidence INTEGER,
    track DOUBLE PRECISION,
    instrument TEXT,
    scan DOUBLE PRECISION,
    satellite TEXT,
    geometry GEOMETRY(POINT, 32720)
);
CREATE INDEX idx_fire_events_geom ON fire_events USING GIST(geometry);


-- Chaco Roads
CREATE TABLE chaco_roads (
    chaco_roads_id SERIAL PRIMARY KEY,
    NOMBRE TEXT,
    TIPO_VIA TEXT,
    DesTipoVia TEXT,
    DesRodaVia TEXT,
    geometry GEOMETRY(LINESTRING, 32720)
);
CREATE INDEX idx_chaco_roads_geom ON chaco_roads USING GIST(geometry);


-- Chaco Rivers
CREATE TABLE chaco_rivers (
    chaco_rivers_id SERIAL PRIMARY KEY,
    NOMBRE TEXT,
    geometry GEOMETRY(MULTILINESTRING, 32720)
);
CREATE INDEX idx_chaco_rivers_geom ON chaco_rivers USING GIST(geometry);


-- Chaco Protected Areas
CREATE TABLE chaco_protected_areas (
    chaco_protected_areas_id SERIAL PRIMARY KEY,
    NAME_ENG TEXT,
    NAME TEXT,
    DESIG TEXT,
    DESIG_ENG TEXT,
    DESIG_TYPE TEXT,
    IUCN_CAT TEXT,
    INT_CRIT TEXT,
    REALM TEXT,
    REP_M_AREA DOUBLE PRECISION,
    REP_AREA DOUBLE PRECISION,
    GIS_AREA DOUBLE PRECISION,
    NO_TAKE TEXT,
    NO_TK_AREA DOUBLE PRECISION,
    GOV_TYPE TEXT,
    GOVSUBTYPE TEXT,
    OWN_TYPE TEXT,
    OWNSUBTYPE TEXT,
    MANG_AUTH TEXT,
    ISO3 TEXT,
    SUPP_INFO TEXT,
    CONS_OBJ TEXT,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_chaco_protected_areas_geom ON chaco_protected_areas USING GIST(geometry);


-- Risk Surface
CREATE TABLE risk_surface (
    risk_surface_id SERIAL PRIMARY KEY,
    id TEXT,
    count INTEGER,
    risk_level INTEGER,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_risk_surface_geom ON risk_surface USING GIST(geometry);


-- Chaco Boundaries
CREATE TABLE chaco_boundaries (
    chaco_boundaries_id SERIAL PRIMARY KEY,
    ADM1_CODE INTEGER,
    ADM1_NAME TEXT,
    area_km2 DOUBLE PRECISION,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_chaco_boundaries_geom ON chaco_boundaries USING GIST(geometry);


-- Chaco Districts
CREATE TABLE chaco_districts (
    chaco_districts_id SERIAL PRIMARY KEY,
    ADM0_ES TEXT,
    ADM0_PCODE TEXT,
    ADM1_ES TEXT,
    ADM1_PCODE TEXT,
    ADM2_ES TEXT,
    ADM2_PCODE TEXT,
    geometry GEOMETRY(MULTIPOLYGON, 32720)
);
CREATE INDEX idx_chaco_districts_geom ON chaco_districts USING GIST(geometry);


-- Fire Events
CREATE TABLE fire_events (
    fire_events_id SERIAL PRIMARY KEY,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    acq_date TIMESTAMP,
    bright_t31 DOUBLE PRECISION,
    brightness DOUBLE PRECISION,
    confidence INTEGER,
    track DOUBLE PRECISION,
    instrument TEXT,
    scan DOUBLE PRECISION,
    satellite TEXT,
    geometry GEOMETRY(POINT, 32720)
);
CREATE INDEX idx_fire_events_geom ON fire_events USING GIST(geometry);


-- Chaco Roads
CREATE TABLE chaco_roads (
    chaco_roads_id SERIAL PRIMARY KEY,
    NOMBRE TEXT,
    TIPO_VIA TEXT,
    DesTipoVia TEXT,
    DesRodaVia TEXT,
    geometry GEOMETRY(LINESTRING, 32720)
);
CREATE INDEX idx_chaco_roads_geom ON chaco_roads USING GIST(geometry);


-- Chaco Rivers
CREATE TABLE chaco_rivers (
    chaco_rivers_id SERIAL PRIMARY KEY,
    NOMBRE TEXT,
    geometry GEOMETRY(MULTILINESTRING, 32720)
);
CREATE INDEX idx_chaco_rivers_geom ON chaco_rivers USING GIST(geometry);


-- Chaco Protected Areas
CREATE TABLE chaco_protected_areas (
    chaco_protected_areas_id SERIAL PRIMARY KEY,
    NAME_ENG TEXT,
    NAME TEXT,
    DESIG TEXT,
    DESIG_ENG TEXT,
    DESIG_TYPE TEXT,
    IUCN_CAT TEXT,
    INT_CRIT TEXT,
    REALM TEXT,
    REP_M_AREA DOUBLE PRECISION,
    REP_AREA DOUBLE PRECISION,
    GIS_AREA DOUBLE PRECISION,
    NO_TAKE TEXT,
    NO_TK_AREA DOUBLE PRECISION,
    GOV_TYPE TEXT,
    GOVSUBTYPE TEXT,
    OWN_TYPE TEXT,
    OWNSUBTYPE TEXT,
    MANG_AUTH TEXT,
    ISO3 TEXT,
    SUPP_INFO TEXT,
    CONS_OBJ TEXT,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_chaco_protected_areas_geom ON chaco_protected_areas USING GIST(geometry);


-- Risk Surface
CREATE TABLE risk_surface (
    risk_surface_id SERIAL PRIMARY KEY,
    id TEXT,
    count INTEGER,
    risk_level INTEGER,
    geometry GEOMETRY(POLYGON, 32720)
);
CREATE INDEX idx_risk_surface_geom ON risk_surface USING GIST(geometry);


-- Pa Households
CREATE TABLE pa_households (
    pa_households_id SERIAL PRIMARY KEY,
    id TEXT,
    fid INTEGER,
    DPTO TEXT,
    DPTO_DESC TEXT,
    DISTRITO TEXT,
    DIST_DESC TEXT,
    AREA TEXT,
    BAR_LOC TEXT,
    BARLO_DESC TEXT,
    geometry GEOMETRY(POINT, 32720)
);
CREATE INDEX idx_pa_households_geom ON pa_households USING GIST(geometry);


-- Boq Households
CREATE TABLE boq_households (
    boq_households_id SERIAL PRIMARY KEY,
    id TEXT,
    fid INTEGER,
    DPTO TEXT,
    DPTO_DESC TEXT,
    DISTRITO TEXT,
    DIST_DESC TEXT,
    AREA TEXT,
    BAR_LOC TEXT,
    BARLO_DESC TEXT,
    geometry GEOMETRY(POINT, 32720)
);
CREATE INDEX idx_boq_households_geom ON boq_households USING GIST(geometry);


-- Ap Households
CREATE TABLE ap_households (
    ap_households_id SERIAL PRIMARY KEY,
    id TEXT,
    fid INTEGER,
    DPTO TEXT,
    DPTO_DESC TEXT,
    DISTRITO TEXT,
    DIST_DESC TEXT,
    AREA TEXT,
    BAR_LOC TEXT,
    BARLO_DESC TEXT,
    geometry GEOMETRY(POINT, 32720)
);
CREATE INDEX idx_ap_households_geom ON ap_households USING GIST(geometry);


-- Indig Comm
CREATE TABLE indig_comm (
    indig_comm_id SERIAL PRIMARY KEY,
    id TEXT,
    fid INTEGER,
    DPTO TEXT,
    DPTO_DESC TEXT,
    DISTRITO TEXT,
    DIST_DESC TEXT,
    AREA TEXT,
    BAR_LOC TEXT,
    BARLO_DESC TEXT,
    geometry GEOMETRY(MULTIPOLYGON, 32720)
);
CREATE INDEX idx_indig_comm_geom ON indig_comm USING GIST(geometry);

