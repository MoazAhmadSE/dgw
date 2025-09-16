/// <reference types="vite/client" />

declare namespace GeoJSON {
  interface FeatureCollection {
    type: 'FeatureCollection';
    features: Feature[];
  }
}
