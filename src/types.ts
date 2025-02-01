import type {
  FeatureData,
  FeatureId,
  Geoman,
} from "@geoman-io/maplibre-geoman-free";
import type { CarmenGeojsonFeature } from "@maplibre/maplibre-gl-geocoder";
import type { MultiPolygon, Polygon } from "geojson";
import type { Map as MlMap } from "maplibre-gl";

export type FeatureGeometry = Polygon | MultiPolygon;

export interface TempFeature {
  id: FeatureId;
  geometry: FeatureGeometry;
}

export interface Feature {
  id: FeatureId;
  geometry: FeatureGeometry;
  isEditing: boolean;
}

export type GeometryBounds = [number, number, number, number];

interface GeomanLoadEvent {
  type: "gm:loaded";
  map: MlMap;
  gm: Geoman;
}

interface GeomanFeatureEvent {
  type:
    | "gm:create"
    | "gm:remove"
    | "gm:cut"
    | "gm:dragstart"
    | "gm:editstart"
    | "gm:rotatestart"
    | "gm:dragend"
    | "gm:editend"
    | "gm:rotateend";
  feature: FeatureData;
}

interface GeocoderResultEvent {
  type: "gc:result";
  result: CarmenGeojsonFeature;
}

export type MapEvent =
  | GeomanLoadEvent
  | GeomanFeatureEvent
  | GeocoderResultEvent;

interface SidebarH3LayerEvent {
  type: "sb:h3layer";
  visible: boolean;
}

interface SidebarH3ResolutionEvent {
  type: "sb:h3resolution";
  resolution: number;
}

interface SidebarIdClickEvent {
  type: "sb:idclick";
  feature: TempFeature | Feature;
}

interface SidebarTempAddEvent {
  type: "sb:tempadd";
  feature: TempFeature;
}

interface SidebarTempDropEvent {
  type: "sb:tempdrop";
  feature: TempFeature;
}

export type SidebarEvent =
  | SidebarH3LayerEvent
  | SidebarH3ResolutionEvent
  | SidebarIdClickEvent
  | SidebarTempAddEvent
  | SidebarTempDropEvent;

export type Event = MapEvent | SidebarEvent;

export type H3Format = "string" | "number";
