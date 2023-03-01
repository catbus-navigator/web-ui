import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_KEY

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-82.8354);
  const [lat, setLat] = useState(34.6767);
  const [zoom, setZoom] = useState(14);
  const [startingAddressLat, setStartingAddressLat] = useState(-82.84463)
  const [startingAddressLon, setStartingAddressLon] = useState(34.67919)
  const [endingAddressLat, setEndingAddressLat] = useState(-82.83889)
  const [endingAddressLon, setEndingAddressLon] = useState(34.67801)

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom
    });
    fetch('https://api.mapbox.com/directions/v5/mapbox/walking/'+ startingAddressLat +'%2C' + startingAddressLon +'%3B' + endingAddressLat + '%2C'+ endingAddressLon + '?alternatives=false&continue_straight=true&geometries=geojson&language=en&overview=simplified&steps=true&access_token='+mapboxgl.accessToken)
            .then(response => response.json())
            .then(data => {
                map.current.addSource('route', {
                  'type': 'geojson',
                  'data': {
                  'type': 'Feature',
                  'properties': {},
                  'geometry': {
                  'type': 'LineString',
                  'coordinates': data.routes[0].geometry.coordinates
                  }
                  }
                });
                map.current.addLayer({
                  'id': 'route',
                  'type': 'line',
                  'source': 'route',
                  'layout': {
                  'line-join': 'round',
                  'line-cap': 'round'
                  },
                  'paint': {
                  'line-color': '#888',
                  'line-width': 8
                  }
                  });
            })
            .catch(error => console.log(error));
  });

  return (
    <div className='Map'>
    <div ref={mapContainer} className="map-container" />
    </div>
  );
}