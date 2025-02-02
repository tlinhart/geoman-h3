import type { MaplibreGeocoderApi } from "@maplibre/maplibre-gl-geocoder";
import { polygonToCells } from "h3-js";
import type { FeatureGeometry, GeometryBounds, H3Format } from "../types";

export const getGeometryBounds = (
  geometry: FeatureGeometry
): GeometryBounds => {
  const coordinates =
    geometry.type === "Polygon"
      ? geometry.coordinates[0]
      : geometry.coordinates.flat(2);
  const minLng = coordinates.reduce((min, current) =>
    min[0] <= current[0] ? min : current
  )[0];
  const minLat = coordinates.reduce((min, current) =>
    min[1] <= current[1] ? min : current
  )[1];
  const maxLng = coordinates.reduce((max, current) =>
    max[0] >= current[0] ? max : current
  )[0];
  const maxLat = coordinates.reduce((max, current) =>
    max[1] >= current[1] ? max : current
  )[1];
  return [minLng, minLat, maxLng, maxLat];
};

export const geometryToH3Cells = (
  geometry: FeatureGeometry,
  resolution: number
): string[] =>
  geometry.type === "Polygon"
    ? polygonToCells(geometry.coordinates, resolution, true)
    : geometry.coordinates.reduce((h3Cells, polygon) => {
        h3Cells.push(...polygonToCells(polygon, resolution, true));
        return h3Cells;
      }, [] as string[]);

export const stringifyGeometry = (geometry: FeatureGeometry): string =>
  JSON.stringify(
    geometry,
    (_, value) =>
      Array.isArray(value) && value.every((v) => typeof v === "number")
        ? JSON.stringify(value, (_, value) =>
            typeof value === "number"
              ? Number.parseFloat(value.toFixed(6))
              : value
          )
        : value,
    2
  ).replace(/"\[(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\]"/g, "[ $1, $2 ]");

export const stringifyH3Cells = (
  h3Cells: string[],
  format: H3Format
): string =>
  format === "string"
    ? JSON.stringify(h3Cells, null, 2)
    : JSON.stringify(
        h3Cells.map((cell) => BigInt(`0x${cell}`)),
        (_, value) => (typeof value === "bigint" ? value.toString() : value),
        2
      ).replace(/"/g, "");

export const nominatimGeocoderApi: MaplibreGeocoderApi = {
  forwardGeocode: async (config) => {
    const features = [];
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${config.query}&format=geojson&polygon_geojson=1&addressdetails=1`
      );
      const geojson = await response.json();
      for (const feature of geojson.features) {
        features.push({
          type: feature.type,
          geometry: feature.geometry,
          bbox: feature.bbox,
          id: feature.properties.place_id,
          place_name: feature.properties.display_name,
          place_type: [feature.properties.type],
          text: feature.properties.name,
          properties: null,
        });
      }
    } catch (error) {
      console.error(`Geocoding failed: ${error}`);
    }
    return { type: "FeatureCollection", features };
  },
  reverseGeocode: async () => ({
    type: "FeatureCollection",
    features: [],
  }),
};

export const flatZoneGeocoderApi: MaplibreGeocoderApi = {
  forwardGeocode: async (config) => {
    const features = [];
    try {
      let response = await fetch("https://api.flatzone.cz/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query AddressSuggestions {
              addressSuggestions(
                country: "CZ",
                term: "${config.query}",
                size: 5,
                levels: [
                  "region",
                  "district",
                  "city",
                  "borough",
                  "cadastral_area",
                  "neighborhood",
                  "cadastral_area"
                ]
              ) {
                level
                name
                extraInfo
                address {
                  country
                  region
                  district
                  city
                  borough
                  neighborhood
                  cadastralArea
                }
              }
            }`,
        }),
      });
      let result = await response.json();
      const suggestions = result.data.addressSuggestions;
      for (const [index, item] of suggestions.entries()) {
        response = await fetch("https://api.flatzone.cz/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query AddressGeometry($address: StructuredAddressInput!) {
                addressGeometry(address: $address) {
                  polygons {
                    exteriorRing {
                      lat
                      lon
                    }
                    interiorRings {
                      lat
                      lon
                    }
                  }
                }
              }`,
            variables: {
              address: Object.fromEntries(
                Object.entries(item.address).filter(
                  ([_, value]) => value != null
                )
              ),
            },
          }),
        });
        result = await response.json();
        const polygons = result.data.addressGeometry.polygons;
        let geometry: FeatureGeometry;
        if (polygons.length === 1) {
          const polygon = polygons[0];
          const polygon_coordinates = [
            polygon.exteriorRing.map(
              ({ lat, lon }: { lat: number; lon: number }) => [lon, lat]
            ),
          ];
          if (polygon.interiorRings) {
            for (const ring of polygon.interiorRings) {
              polygon_coordinates.push(
                ring.map(({ lat, lon }: { lat: number; lon: number }) => [
                  lon,
                  lat,
                ])
              );
            }
          }
          geometry = { type: "Polygon", coordinates: polygon_coordinates };
        } else {
          const multipolygon_coordinates = [];
          for (const polygon of polygons) {
            const polygon_coordinates = [
              polygon.exteriorRing.map(
                ({ lat, lon }: { lat: number; lon: number }) => [lon, lat]
              ),
            ];
            if (polygon.interiorRings) {
              for (const ring of polygon.interiorRings) {
                polygon_coordinates.push(
                  ring.map(({ lat, lon }: { lat: number; lon: number }) => [
                    lon,
                    lat,
                  ])
                );
              }
            }
            multipolygon_coordinates.push(polygon_coordinates);
          }
          geometry = {
            type: "MultiPolygon",
            coordinates: multipolygon_coordinates,
          };
        }
        features.push({
          type: "Feature" as const,
          geometry: geometry,
          bbox: getGeometryBounds(geometry),
          id: index,
          place_name: item.extraInfo
            ? `${item.name}, ${item.extraInfo}`
            : item.name,
          place_type: [item.level],
          text: item.name,
          properties: null,
        });
      }
    } catch (error) {
      console.error(`Geocoding failed: ${error}`);
    }
    return { type: "FeatureCollection", features };
  },
  reverseGeocode: async () => ({
    type: "FeatureCollection",
    features: [],
  }),
};
