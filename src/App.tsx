import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import GmMap from "./components/GmMap";
import Sidebar from "./components/Sidebar";
import "./App.css";
import type { Geoman } from "@geoman-io/maplibre-geoman-free";
import { cellsToMultiPolygon } from "h3-js";
import type { Event, Feature, FeatureGeometry, TempFeature } from "./types";
import { geometryToH3Cells, getGeometryBounds } from "./utils";

const App = () => {
  const mapInstance = useRef<MlMap>(null);
  const geomanInstance = useRef<Geoman>(null);
  const tempFeatureCounter = useRef<number>(0);
  const [tempFeatures, setTempFeatures] = useState<TempFeature[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [h3Resolution, setH3Resolution] = useState<number>(8);

  const handleEvent = useCallback((event: Event) => {
    console.debug("Event", event);

    switch (event.type) {
      case "gm:loaded":
        mapInstance.current = event.map;
        geomanInstance.current = event.gm;
        break;
      case "gc:result":
        if (["Polygon", "MultiPolygon"].includes(event.result.geometry.type)) {
          tempFeatureCounter.current += 1;
          setTempFeatures((features) =>
            features.concat({
              id: `temp-${tempFeatureCounter.current}`,
              geometry: event.result.geometry as FeatureGeometry,
            })
          );
        }
        break;
      case "gm:create":
        setFeatures((features) =>
          features.concat({
            id: event.feature.id,
            geometry: event.feature.getGeoJson().geometry as FeatureGeometry,
            isEditing: false,
          })
        );
        break;
      case "gm:remove":
        setFeatures((features) =>
          features.filter((feature) => feature.id !== event.feature.id)
        );
        break;
      case "gm:dragstart":
      case "gm:editstart":
      case "gm:rotatestart":
        setFeatures((features) =>
          features.map((feature) =>
            feature.id === event.feature.id
              ? {
                  id: event.feature.id,
                  geometry: event.feature.getGeoJson()
                    .geometry as FeatureGeometry,
                  isEditing: true,
                }
              : feature
          )
        );
        break;
      case "gm:dragend":
      case "gm:editend":
      case "gm:rotateend":
      case "gm:cut":
        setFeatures((features) =>
          features.map((feature) =>
            feature.id === event.feature.id
              ? {
                  id: event.feature.id,
                  geometry: event.feature.getGeoJson()
                    .geometry as FeatureGeometry,
                  isEditing: false,
                }
              : feature
          )
        );
        break;
      case "sb:h3layer":
        mapInstance.current?.setLayoutProperty(
          "h3-cells",
          "visibility",
          event.visible ? "visible" : "none"
        );
        break;
      case "sb:h3resolution":
        setH3Resolution(event.resolution);
        break;
      case "sb:idclick":
        {
          const bounds = getGeometryBounds(event.feature.geometry);
          const transform = mapInstance.current?.cameraForBounds(bounds, {
            maxZoom: 14,
            padding: 50,
          });
          if (transform) {
            mapInstance.current?.flyTo(transform);
          }
        }
        break;
      case "sb:tempadd":
        geomanInstance.current?.features.createFeature({
          sourceName: "gm_main",
          shapeGeoJson: {
            type: "Feature",
            geometry: event.feature.geometry,
            properties: {
              shape: "polygon",
            },
          },
        });
        setTempFeatures((features) =>
          features.filter((feature) => feature.id !== event.feature.id)
        );
        break;
      case "sb:tempdrop":
        setTempFeatures((features) =>
          features.filter((feature) => feature.id !== event.feature.id)
        );
        break;
    }
  }, []);

  useEffect(() => {
    const source = mapInstance.current?.getSource(
      "temp-features"
    ) as GeoJSONSource;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: tempFeatures.map((feature) => ({
          type: "Feature",
          id: feature.id,
          properties: {},
          geometry: feature.geometry,
        })),
      });
    }
  }, [tempFeatures]);

  useEffect(() => {
    const source = mapInstance.current?.getSource("h3-cells") as GeoJSONSource;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: features
          .filter((feature) => !feature.isEditing)
          .map((feature) => ({
            type: "Feature",
            id: feature.id,
            properties: {},
            geometry: {
              type: "MultiPolygon",
              coordinates: cellsToMultiPolygon(
                geometryToH3Cells(feature.geometry, h3Resolution),
                true
              ),
            },
          })),
      });
    }
  }, [features, h3Resolution]);

  return (
    <main className="main">
      <GmMap handleEvent={handleEvent} />
      <Sidebar
        tempFeatures={tempFeatures}
        features={features}
        h3Resolution={h3Resolution}
        handleEvent={handleEvent}
      />
    </main>
  );
};

export default App;
