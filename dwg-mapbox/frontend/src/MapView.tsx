import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef } from 'react';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

type Props = {
  geojson?: GeoJSON.FeatureCollection;
};

export default function MapView({ geojson }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 0],
      zoom: 2,
    });
    map.addControl(new mapboxgl.NavigationControl());
    mapRef.current = map;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!geojson) return;

    const sourceId = 'dwg-geojson';
    const lineLayerId = 'dwg-lines';
    const fillLayerId = 'dwg-fills';

    const addData = () => {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.addSource(sourceId, { type: 'geojson', data: geojson });
        map.addLayer({ id: lineLayerId, type: 'line', source: sourceId, paint: { 'line-color': '#ff6600', 'line-width': 2 } });
        map.addLayer({ id: fillLayerId, type: 'fill', source: sourceId, paint: { 'fill-color': '#3399ff', 'fill-opacity': 0.2 } });
      }

      // Fit bounds
      const bbox = turf.bbox(geojson as any);
      map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, duration: 500 });
    };

    if (map.isStyleLoaded()) addData();
    else map.once('load', addData);
  }, [geojson]);

  return <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0 }} />;
}

