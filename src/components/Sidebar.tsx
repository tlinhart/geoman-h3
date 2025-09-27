import { useEffect, useRef, useState } from "react";
import type { Feature, H3Format, SidebarEvent, TempFeature } from "../types";
import {
  geometryToH3Cells,
  stringifyGeometry,
  stringifyH3Cells,
} from "../utils";

interface SidebarProps {
  tempFeatures: TempFeature[];
  features: Feature[];
  h3Resolution: number;
  handleEvent: (event: SidebarEvent) => void;
}

const Sidebar = ({
  tempFeatures,
  features,
  h3Resolution,
  handleEvent,
}: SidebarProps) => {
  const sidebarElement = useRef<HTMLDivElement>(null);
  const tempFeatureCount = useRef<number>(tempFeatures.length);
  const featureCount = useRef<number>(features.length);

  const [h3Format, setH3Format] = useState<H3Format>("string");
  const [expandedGeoJsonId, setExpandedGeoJsonId] = useState<
    Feature["id"] | null
  >(null);
  const [expandedH3CellsId, setExpandedH3CellsId] = useState<
    Feature["id"] | null
  >(null);

  useEffect(() => {
    if (tempFeatures.length > tempFeatureCount.current) {
      sidebarElement.current?.scrollTo(0, 0);
    }
    tempFeatureCount.current = tempFeatures.length;
  }, [tempFeatures.length]);

  useEffect(() => {
    if (features.length > featureCount.current) {
      sidebarElement.current?.scrollTo(0, sidebarElement.current.scrollHeight);
    }
    featureCount.current = features.length;
  }, [features.length]);

  return (
    <div className="sidebar" ref={sidebarElement}>
      <div className="sidebar-options">
        <label>
          <input
            type="checkbox"
            defaultChecked={false}
            onChange={(event) =>
              handleEvent({ type: "sb:h3layer", visible: event.target.checked })
            }
          />
          Show H3 cells layer
        </label>
        <br />
        <label>
          H3 resolution:
          <input
            type="number"
            min={5}
            max={10}
            value={h3Resolution}
            onChange={(event) =>
              handleEvent({
                type: "sb:h3resolution",
                resolution: Number.parseInt(event.target.value, 10),
              })
            }
          />
        </label>
        <br />
        <label>
          H3 index format:
          <select
            value={h3Format}
            onChange={(event) => setH3Format(event.target.value as H3Format)}
          >
            <option value="string">string</option>
            <option value="number">number</option>
          </select>
        </label>
      </div>
      {tempFeatures.toReversed().map((feature) => (
        <div className="feature" key={feature.id}>
          <div>
            Feature ID:{" "}
            <button
              className="feature-id"
              type="button"
              onClick={() => handleEvent({ type: "sb:idclick", feature })}
            >
              {feature.id}
            </button>
          </div>
          <button
            className="temp-add"
            type="button"
            onClick={() => handleEvent({ type: "sb:tempadd", feature })}
          >
            ✔ Add
          </button>
          <button
            className="temp-drop"
            type="button"
            onClick={() => handleEvent({ type: "sb:tempdrop", feature })}
          >
            ✘ Drop
          </button>
        </div>
      ))}
      {features.map((feature) => (
        <div className="feature" key={feature.id}>
          <div>
            Feature ID:{" "}
            <button
              className="feature-id"
              type="button"
              onClick={() => handleEvent({ type: "sb:idclick", feature })}
            >
              {feature.id}
            </button>
          </div>
          <button
            className="content-header"
            type="button"
            onClick={() =>
              setExpandedGeoJsonId((id) =>
                id === feature.id ? null : feature.id
              )
            }
          >
            GeoJSON
          </button>
          {expandedGeoJsonId === feature.id && (
            <pre className="content">{stringifyGeometry(feature.geometry)}</pre>
          )}
          <button
            className="content-header"
            type="button"
            onClick={() =>
              setExpandedH3CellsId((id) =>
                id === feature.id ? null : feature.id
              )
            }
          >
            H3 cells
          </button>
          {expandedH3CellsId === feature.id && (
            <pre className="content">
              {stringifyH3Cells(
                geometryToH3Cells(feature.geometry, h3Resolution),
                h3Format
              )}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
};

export default Sidebar;
