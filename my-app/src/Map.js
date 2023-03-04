import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import { AddressAutofill } from '@mapbox/search-js-react';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_KEY

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-82.8354);
  const [lat, setLat] = useState(34.6767);
  const [zoom, setZoom] = useState(14);

    const [busStops, setBusStops] = useState([])

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

    // Effect hook to fetch the bus routes data from the API
    useEffect(() => {
        fetch('https://api-my.app.clemson.edu/api/v0/map/bus/routes')
            .then(response => response.json())
            .then(data => {
                setBusStops(data.stops)
                //console.log(data.stops)
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

  function onCalculateHandler(){
    const startingAddressArray = document.getElementById('startingAddress').value.split(" ")
    const endingAddressArray = document.getElementById('endingAddress').value.split(" ")
    fetch('https://api.mapbox.com/geocoding/v5/mapbox.places/'+ startingAddressArray[0] + '%20'+ startingAddressArray[1] + '%20'+ startingAddressArray[2] + '%20'+ startingAddressArray[3] + '.json?proximity=-82.83673382875219%2C34.676993908723304&access_token='+mapboxgl.accessToken)
    .then(response => response.json())
    .then(data => {
      fetch('https://api.mapbox.com/geocoding/v5/mapbox.places/'+ endingAddressArray[0] + '%20'+ endingAddressArray[1] + '%20'+ endingAddressArray[2] + '%20'+ endingAddressArray[3] + '.json?proximity=-82.83673382875219%2C34.676993908723304&access_token='+mapboxgl.accessToken)
      .then(response2 => response2.json())
      .then(data2 => {
        fetch('https://api.mapbox.com/directions/v5/mapbox/walking/'+ data.features[0].center[0] +'%2C' + data.features[0].center[1] +'%3B' + data2.features[0].center[0] + '%2C'+ data2.features[0].center[1] + '?alternatives=false&continue_straight=true&geometries=geojson&language=en&overview=simplified&steps=true&access_token='+mapboxgl.accessToken)
            .then(response => response.json())
            .then(data3 => {
                if (map.current.getSource('route')){
                  map.current.getSource('route').setData({
                  'type': 'Feature',
                  'properties': {},
                  'geometry': {
                  'type': 'LineString',
                  'coordinates': data3.routes[0].geometry.coordinates
                  }
                  })
                }
                else {
                map.current.addSource('route', {
                  'type': 'geojson',
                  'data': {
                  'type': 'Feature',
                  'properties': {},
                  'geometry': {
                  'type': 'LineString',
                  'coordinates': data3.routes[0].geometry.coordinates
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
              }
            })
            .catch(error => console.log(error));
      })
    })
  }

  return (
    <div className='Map'>
    <div style={{marginRight: "75%"}}>
    <form style={{alignItems: "center", flexDirection: "column"}}>
      <label htmlFor="startingAddress">Starting Address:   </label>
      <AddressAutofill accessToken={mapboxgl.accessToken}>
      <input id="startingAddress" name="startingAddress" autoComplete="shipping address-line1"></input>
      </AddressAutofill>
    </form>
    <form style={{alignItems: "center", flexDirection: "column"}}>
        <label htmlFor="endingAddress">Ending Address:   </label>
        <AddressAutofill accessToken={mapboxgl.accessToken}>
        <input type="text" id="endingAddress" name="endingAddress"></input>
        </AddressAutofill>
    </form>
    <input type="button" value="Get Bus Directions!" onClick={onCalculateHandler}/>
    </div>
    <div ref={mapContainer} className="map-container" />
    </div>
  );
}