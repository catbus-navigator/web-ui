import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_KEY

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-82.8354);
  const [lat, setLat] = useState(34.6767);
  const [zoom, setZoom] = useState(14);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom
    });

    // Add navigation control to the map
    map.current.addControl(new mapboxgl.NavigationControl({
        showZoom: true,
        showCompass: false,
        showCurrentLocation: true, // this enables the "Show my location" icon
        positionOptions: {
            enableHighAccuracy: true // enable high accuracy for better location accuracy
        },
        visualizePitch: true
    }));

      // Add geolocate control to the map
      map.current.addControl(new mapboxgl.GeolocateControl({
          positionOptions: {
              enableHighAccuracy: true // enable high accuracy for better location accuracy
          },
          fitBoundsOptions: {
              maxZoom: 15 // set a maximum zoom level when fitting the bounds
          }
      }));

  }, []);

  return (
    <div className='Map'>
    <div ref={mapContainer} className="map-container" />
    </div>
  );
}