import { Map as MlMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import MaplibreGeocoder from "@maplibre/maplibre-gl-geocoder";
import "@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css";
import { Geoman } from "@geoman-io/maplibre-geoman-free";
import "@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css";
import type { MapEvent } from "../types";
import { flatZoneGeocoderApi } from "../utils";

interface GmMapProps {
  handleEvent: (event: MapEvent) => void;
}

const GmMap = ({ handleEvent }: GmMapProps) => {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<MlMap>(null);

  useEffect(() => {
    if (mapElement.current) {
      const map = new MlMap({
        container: mapElement.current,
        style: "https://tiles.openfreemap.org/styles/bright",
        bounds: [11.75, 48.45, 19.22, 51.21],
        fadeDuration: 50,
        attributionControl: false,
      });
      mapInstance.current = map;

      const geocoder = new MaplibreGeocoder(flatZoneGeocoderApi, {
        showResultsWhileTyping: true,
        showResultMarkers: false,
        marker: false,
        zoom: 14,
      });
      map.addControl(geocoder);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          ({ coords: { longitude, latitude } }: GeolocationPosition) => {
            map.flyTo({ center: [longitude, latitude], zoom: 8 });
            geocoder.setProximity({ longitude, latitude });
          },
          (error) => {
            console.error("Failed to get user location:", error);
          }
        );
      } else {
        console.error("Your browser does not support geolocation");
      }

      map.on("load", () => {
        map.addSource("temp-features", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "temp-features",
          type: "fill",
          source: "temp-features",
          layout: { visibility: "visible" },
          paint: {
            "fill-color": "#839faf",
            "fill-opacity": 0.4,
            "fill-outline-color": "#000000",
          },
        });

        map.addSource("h3-cells", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "h3-cells",
          type: "fill",
          source: "h3-cells",
          layout: { visibility: "none" },
          paint: {
            "fill-color": "#ff69b4",
            "fill-opacity": 0.5,
            "fill-outline-color": "#000000",
          },
        });
      });

      new Geoman(map, {
        controls: {
          draw: {
            marker: { uiEnabled: false },
            circle_marker: { uiEnabled: false },
            circle: { uiEnabled: true },
            text_marker: { uiEnabled: false },
            line: { uiEnabled: false },
            rectangle: { uiEnabled: true },
            polygon: { uiEnabled: true },
          },
          edit: {},
          helper: {
            shape_markers: { uiEnabled: false },
            snapping: { uiEnabled: false, active: true },
            zoom_to_features: { uiEnabled: true },
          },
        },
      });

      map.once("gm:loaded", (event: MapEvent) => {
        map.on("gm:create", handleEvent);
        map.on("gm:remove", handleEvent);
        map.on("gm:cut", handleEvent);
        map.on("gm:dragstart", handleEvent);
        map.on("gm:editstart", handleEvent);
        map.on("gm:rotatestart", handleEvent);
        map.on("gm:dragend", handleEvent);
        map.on("gm:editend", handleEvent);
        map.on("gm:rotateend", handleEvent);

        handleEvent(event);
      });

      geocoder.on("result", ({ result }) =>
        handleEvent({ type: "gc:result", result })
      );
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, [handleEvent]);

  return <div className="map" ref={mapElement} />;
};

export default GmMap;
