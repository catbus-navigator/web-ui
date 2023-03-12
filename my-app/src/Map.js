import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_KEY

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-82.8354);
  const [lat, setLat] = useState(34.6767);
  const [zoom, setZoom] = useState(14);
  const [busStops, setBusStops] = useState([])
  const [busRoutes, setBusRoutes] = useState([])
  const [busRoutesMap, setBusRoutesMap] = useState({})

    var drawRoutes = [
        [-122.4194, 37.7749],
        [-122.4294, 37.7649],
        [-122.4394, 37.7549],
        [-122.4494, 37.7449]
    ];  

    useEffect(() => {
        if (map.current) return; // initialize map only once
        map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [lng, lat],
        zoom: zoom
        });

        map.current.on('load', () => {
            map.current.addLayer({
                id: 'route',
                type: 'line',
                source: {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: drawRoutes,
                        },
                    },
                },
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                },
                paint: {
                    'line-color': '#888',
                    'line-width': 8,
                },
            });
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
                setBusRoutes(data.routes)


                let map = {};
                Object.entries(data.routes).map(([key, value]) => {
                    value.stops.forEach( stop => {
                        map[stop] = value;
                    })
                })

                setBusRoutesMap(map);
            })
            .catch(error => console.log(error));
    }, []);

    // Effect hook to update bustops on the boxmap
    useEffect ( () => {

        const popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false
        })

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

            markerEl.addEventListener('click', function () {


                const routeName = busRoutesMap[key] != undefined ? busRoutesMap[key].name : '';

                let description = `<h3>${value.name}</h3><hr/><b> ${routeName}</b>`;

                fetch('https://api-my.app.clemson.edu/api/v0/map/bus/arrivals/'+key)
                    .then(response => response.json())
                    .then(data => {

                        let position;
                        Object.entries(data).map(([dataKey, dataValue]) => {

                            position = dataValue[0];

                            if (position) {

                                // get the current time
                                const currentTime = new Date();

                                // parse the arrival time from the API response
                                const arrivalTime = new Date(position["arrival"]);

                                // calculate the difference between the arrival time and the current time
                                const timeDiff = arrivalTime.getTime() - currentTime.getTime();

                                // convert the time difference from milliseconds to minutes
                                const timeDiffInMinutes = Math.round(timeDiff / 1000 / 60);

                                description += `<hr/><div> : Expected Time = ${timeDiffInMinutes} minutes<div>`
                            }
                        })



                        // Change the cursor style as a UI indicator.
                        map.current.getCanvas().style.cursor = 'pointer';

                        // Populate the popup and set its coordinates
                        // based on the feature found.
                        popup.setLngLat(busCoordinates).setHTML(description).addTo(map.current);

                    })
                    .catch(error => console.log(error));

            });

        })

    }, [busStops])

    return (
    <div className='Map'>
    <div ref={mapContainer} className="map-container" />
    </div>
  );
}