-- ================================
-- Functions
-- ================================

-- 1. Get households at risk
CREATE OR REPLACE FUNCTION get_household_risk(
    tbl_name text, 
    dist_high int, 
    dist_mod int
) 
RETURNS TABLE(id text, risk_class text, geom text) AS 
$$
BEGIN
    RETURN QUERY EXECUTE format('
        SELECT DISTINCT ON (h.id)
            h.id,
            CASE 
                WHEN ST_DWithin(r.geometry, h.geometry, %L) THEN %L
                WHEN ST_DWithin(r.geometry, h.geometry, %L) THEN %L
                ELSE %L
            END,
            ST_AsGeoJSON(ST_Transform(h.geometry, 4326)) AS geom
        FROM %I AS h
        LEFT JOIN risk_surface AS r ON ST_DWithin(r.geometry, h.geometry, %L)
        ORDER BY h.id', 
        dist_high, 'High', dist_mod, 'Moderate', 'No risk', tbl_name, dist_mod);
END;
$$ LANGUAGE plpgsql;

-- 2. Get indigenous communities at risk
CREATE OR REPLACE FUNCTION get_ind_comm_risk(
    region_name text, 
    dist_high int, 
    dist_mod int
) 
RETURNS TABLE(id text, risk_class text, geom text) AS 
$$
BEGIN
    RETURN QUERY EXECUTE format('
        SELECT DISTINCT ON (i.id)
            i.id,
            CASE 
                WHEN ST_DWithin(r.geometry, i.geometry, %L) THEN %L
                WHEN ST_DWithin(r.geometry, i.geometry, %L) THEN %L
                ELSE %L
            END AS risk_class,
            ST_AsGeoJSON(ST_Transform(i.geometry, 4326)) AS geom
        FROM indig_comm AS i
        INNER JOIN (SELECT
            "ADM1_CODE",
            geometry
            FROM
            chaco_boundaries
            WHERE "ADM1_NAME" = %L
            ) AS c ON ST_Intersects(i.geometry, c.geometry)
        LEFT JOIN risk_surface AS r ON ST_DWithin(r.geometry, i.geometry, %L)
        ORDER BY i.id', 
        dist_high, 'High', dist_mod, 'Moderate', 'No risk', region_name, dist_mod);
END;
$$ LANGUAGE plpgsql;

-- 3. Get protected areas at risk
CREATE OR REPLACE FUNCTION get_pa_risk(
    region_name text, 
    dist_high int, 
    dist_mod int
) 
RETURNS TABLE(name text, risk_class text, geom text) AS 
$$
BEGIN
    RETURN QUERY EXECUTE format('
        SELECT DISTINCT ON (p.geometry)
            p."NAME",
            CASE 
                WHEN ST_DWithin(r.geometry, p.geometry, %L) THEN %L
                WHEN ST_DWithin(r.geometry, p.geometry, %L) THEN %L
                ELSE %L
            END,
            ST_AsGeoJSON(ST_Transform(p.geometry, 4326)) AS geom
        FROM chaco_protected_areas AS p
        INNER JOIN (SELECT
            "ADM1_CODE",
            geometry
            FROM
            chaco_boundaries
            WHERE "ADM1_NAME" = %L
            ) AS c ON ST_Intersects(p.geometry, c.geometry)
        LEFT JOIN risk_surface AS r ON ST_DWithin(r.geometry, p.geometry, %L)', 
        dist_high, 'High', dist_mod, 'Moderate', 'No risk', region_name, dist_mod);
END;
$$ LANGUAGE plpgsql;

-- 4. Get administrative boundaries
CREATE OR REPLACE FUNCTION get_admin1(region_name text) 
RETURNS TABLE(ADM1_NAME text, high_risk_area_ha DECIMAL, moderate_risk_area_ha DECIMAL, no_risk_area_ha DECIMAL, geom text) AS 
$$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT 
              c."ADM1_NAME",
              ROUND((SUM(CASE WHEN f.risk_level IN (4, 3) THEN ST_Area(f.geometry) ELSE 0 END) / 10000)::numeric, 0) AS high_risk_area_ha,
              ROUND((SUM(CASE WHEN f.risk_level = 2 THEN ST_Area(f.geometry) ELSE 0 END) / 10000)::numeric, 0) AS moderate_risk_area_ha,
              ROUND((SUM(CASE WHEN f.risk_level = 1 THEN ST_Area(f.geometry) ELSE 0 END) / 10000)::numeric, 0) AS no_risk_area_ha,
              ST_AsGeoJSON(ST_Transform(c.geometry, 4326)) AS gesom 
            FROM chaco_boundaries AS c
            JOIN risk_surface AS f
            ON ST_Contains(c.geometry, f.geometry)
            WHERE c."ADM1_NAME" = %L
            GROUP BY c."ADM1_NAME", c.geometry', 
        region_name);
END;
$$ LANGUAGE plpgsql;

