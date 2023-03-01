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

    const [busStops, setBusStops] = useState([])

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

    // Effect hook to fetch the bus routes data from the API
    useEffect(() => {
        fetch('https://api-my.app.clemson.edu/api/v0/map/bus/routes')
            .then(response => response.json())
            .then(data => {
                setBusStops(data.stops)
                console.log(data.stops)
            })
            .catch(error => console.log(error));
    }, []);

    // Effect hook to update bustops on the boxmap
    useEffect ( () => {

        Object.entries(busStops).map(([key, value]) => {

            const busCoordinates = [value.coordinate.lng, value.coordinate.lat];

            // Define the marker styling
            const markerEl = document.createElement('div');
            markerEl.style.background = 'red';
            markerEl.style.border = '4px solid black';
            markerEl.style.width = '10px';
            markerEl.style.height = '10px';
            markerEl.style.borderRadius = '50%';

            // Create a new marker with the custom styling
            const marker = new mapboxgl.Marker({
                element: markerEl,
                anchor: 'center'
            })
                .setLngLat(busCoordinates)
                .addTo(map.current);
        })

    }, [busStops])

  return (
    <div className='Map'>
    <div ref={mapContainer} className="map-container" />
    </div>
  );
}