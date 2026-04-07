-- ============================================================
-- FIX: Corrección de sustraendoFact en tabla "IslrRate"
-- Decreto 1808 - ISLR Venezuela
-- 
-- PROBLEMA: El campo sustraendoFact almacenaba el RESULTADO
--           final del sustraendo (107.50 Bs) en lugar del
--           FACTOR CONSTANTE PURO del Decreto (83.3334 UT).
--
-- FÓRMULA CORRECTA:
--   Sustraendo = Valor_UT × sustraendoFact × (porcentaje / 100)
--   Ej: 43 × 83.3334 × 0.03 = 107.50 Bs ✅
--
-- IMPACTO: Todos los conceptos donde personType EN (PNR, PNNR)
--          El factor para PJD y PJND es 0 → no requiere cambio.
--
-- EJECUTAR EN: Supabase → SQL Editor
-- FECHA FIX:   2026-03-30
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- PASO 1: Verificar estado ACTUAL antes del cambio
-- ─────────────────────────────────────────────────────────────
-- Ejecuta este SELECT primero para confirmar que los valores
-- actuales son incorrectos (107.50 o 35.83 en PNR).
-- ─────────────────────────────────────────────────────────────
SELECT
    c.code          AS "Cód. Concepto",
    c.description   AS "Descripción",
    r."personType"  AS "Tipo Persona",
    r.percentage    AS "% Retención",
    r."sustraendoFact" AS "Factor Actual (ANTES del fix)"
FROM "IslrRate" r
JOIN "IslrConcept" c ON c.id = r."conceptId"
ORDER BY c.code, r."personType";


-- ─────────────────────────────────────────────────────────────
-- PASO 2: CORRECCIÓN — Actualizar sustraendoFact a 83.3334
--
-- Aplica a TODOS los conceptos con personType PNR o PNNR.
-- El factor 83.3334 es el constante puro del Decreto 1808
-- que, multiplicado por el porcentaje y la UT, da el sustraendo.
--
-- Para PNR (3%):   43 × 83.3334 × 0.03 = 107.50 ✅
-- Para PNR (1%):   43 × 83.3334 × 0.01 =  35.83 ✅
-- Para PNR (5%):   43 × 83.3334 × 0.05 = 179.17 ✅
-- ─────────────────────────────────────────────────────────────
UPDATE "IslrRate"
SET "sustraendoFact" = 83.3334
WHERE "personType" IN ('PNR', 'PNNR');


-- ─────────────────────────────────────────────────────────────
-- PASO 3: Confirmar que PJD y PJND siguen en 0 (sin sustraendo)
-- (Solo como verificación — no debería cambiar nada)
-- ─────────────────────────────────────────────────────────────
UPDATE "IslrRate"
SET "sustraendoFact" = 0.0000
WHERE "personType" IN ('PJD', 'PJND');


-- ─────────────────────────────────────────────────────────────
-- PASO 4: Verificar estado FINAL después del cambio
-- ─────────────────────────────────────────────────────────────
SELECT
    c.code              AS "Cód. Concepto",
    c.description       AS "Descripción",
    r."personType"      AS "Tipo Persona",
    r.percentage        AS "% Retención",
    r."sustraendoFact"  AS "Factor (DESPUÉS del fix)",
    -- Simulación con UT = 43 para validar visualmente
    ROUND(
        43 * r."sustraendoFact" * (r.percentage / 100),
        2
    ) AS "Sustraendo simulado (UT=43)"
FROM "IslrRate" r
JOIN "IslrConcept" c ON c.id = r."conceptId"
ORDER BY c.code, r."personType";


-- ─────────────────────────────────────────────────────────────
-- PASO 5: Confirmar transacción
-- Si el PASO 4 muestra los valores correctos, ejecuta COMMIT.
-- De lo contrario, ejecuta ROLLBACK para deshacer todo.
-- ─────────────────────────────────────────────────────────────
COMMIT;

-- En caso de error, descometar esta línea y ejecutar:
-- ROLLBACK;
