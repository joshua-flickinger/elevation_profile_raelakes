import { gpx } from "https://unpkg.com/@tmcw/togeojson?module";

import EsriMap from "esri/Map.js";
import SceneView from "esri/views/SceneView.js";
import MapView from "esri/views/MapView.js";
import ElevationProfile from "esri/widgets/ElevationProfile.js";
import LayerList from "esri/widgets/LayerList.js";
import FeatureLayer from "esri/layers/FeatureLayer.js";
import { LineSymbol3D, LineSymbol3DLayer, PointSymbol3D, IconSymbol3DLayer } from "esri/symbols.js";
import { Polyline, Point } from "esri/geometry.js";
import ElevationProfileLineInput from "esri/widgets/ElevationProfile/ElevationProfileLineInput.js";
import Graphic from "esri/Graphic.js";
import GraphicsLayer from "esri/layers/GraphicsLayer.js";

const map = new EsriMap({
  basemap: "satellite",
  ground: "world-elevation",
});

const view = new SceneView({
  map: map,
  container: "viewDiv",
  qualityProfile: "high",
  camera: {
    position: [
      -118.48858,
      36.82330,
      30000
    ],
    heading: 0,
    tilt: 0
  },
  environment: {
    atmosphere: { quality: "high" },
  },
  ui: {
    components: ["attribution"],
  },
  popup: {
    defaultPopupTemplateEnabled: true
  }
});

const elevationProfile = new ElevationProfile({
  view,
  profiles: [
    new ElevationProfileLineInput({ color: [245, 203, 66], title: "Hike Track" }),
  ],
  visibleElements: {
    selectButton: false,
    sketchButton: false,
    settingsButton: false,
  },
});

view.ui.add(elevationProfile, "top-right");

(async () => {
  // read the gpx file and convert it to geojson
  const response = await fetch("./RaeLakes.gpx");
  const gpxcontent = await response.text();
  const geojson = gpx(new DOMParser().parseFromString(gpxcontent, "text/xml"));
  const coordinates = geojson.features[0].geometry.coordinates;

  // add the track as an input for the ElevationProfile widget
  const geometry = new Polyline({
    paths: [coordinates],
    hasZ: true
  });
  elevationProfile.input = new Graphic({ geometry: geometry });

  // add the hike track layer
  const hikeTrackLayer = new GraphicsLayer({
    elevationInfo: {
      mode: "relative-to-ground",
      featureExpressionInfo: {
        expression: "5"
      }
    },
    listMode: "hide",
  });

  const hikeTrack = new Graphic({
    geometry: geometry,
    symbol: new LineSymbol3D({
      symbolLayers: [new LineSymbol3DLayer({
        material: { color: [245, 203, 66] },
        size: 3
      })]
    })
  });
  hikeTrackLayer.add(hikeTrack);

  // create a point layer showing the start and the end points of the track
  const start = coordinates[0];
  const startPoint = {
    geometry: new Point({
      x: start[0],
      y: start[1],
      z: start[2]
    }),
    attributes: {
      ObjectID: 1,
      type: "start"
    }

  };
  const end = coordinates[coordinates.length - 1];
  const endPoint = {
    geometry: new Point({
      x: end[0],
      y: end[1],
      z: end[2]
    }),
    attributes: {
      ObjectID: 2,
      type: "end"
    }
  };

  const pointsLayer = new FeatureLayer({
    source: [startPoint, endPoint],
    objectIdField: "ObjectID",
    title: "Start & arrival points",
    fields: [{
      name: "ObjectID",
      alias: "ObjectID",
      type: "oid"
    }, {
      name: "type",
      alias: "type",
      type: "string"
    }],
    renderer: {
      type: "unique-value",
      field: "type",
      uniqueValueInfos: [{
        value: "start",
        symbol: getPointSymbol([108, 235, 184]),
        label: "Start point"
      }, {
        value: "end",
        symbol: getPointSymbol([168, 8, 8]),
        label: "Arrival point"
      }],
      legendOptions: {
        title: " "
      }
    }
  });

  map.addMany([hikeTrackLayer, pointsLayer]);

})();

function getPointSymbol(color) {
  return new PointSymbol3D({
    symbolLayers: [new IconSymbol3DLayer({
      resource: { primitive: "circle"},
      material: { color: color },
      outline: {
        color: [255, 255, 255, 1],
        size: 1.5
      },
      size: 10
    })],
    verticalOffset: {
      screenLength: 40,
      maxWorldLength: 200,
      minWorldLength: 20
    },
    callout: {
      type: "line",
      size: 1.5,
      color: [255, 255, 255, 1],
      border: {
        color: [0, 0, 0, 0]
      }
    }
  });
}
