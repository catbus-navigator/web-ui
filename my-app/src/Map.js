import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import { AddressAutofill } from '@mapbox/search-js-react';
import moment from 'moment';
moment().format();

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_KEY

// takes in a route ID, starting bus stop ID, and ending bus stop ID, and calculates the time to travel between them
// assumes the next bus available is taken
// Uses the catbus.ridesystems.net API, with ids taken from there
// Returns time between the two stops in milliseconds
async function calculateBusRouteTime(routeID, startingStopID, endingStopID){
        const time = await fetch('https://catbus.ridesystems.net/Services/JSONPRelay.svc/GetRouteStopArrivals').then(response => response.json())
        .then(data => {
            const startingStop = data.find(e => e.RouteStopID == startingStopID && e.RouteID == routeID)
            console.log(startingStop)
            const busNum = startingStop.ScheduledTimes[0].AssignedVehicleId
            const departureTime = (moment.utc(startingStop.ScheduledTimes[0].DepartureTimeUTC).valueOf())
            console.log(departureTime)

            const endingStop = data.find(e => e.RouteStopID == endingStopID && e.RouteID == routeID)
            console.log(endingStop)
            const arrivalTime = (moment.utc(endingStop.ScheduledTimes.find(e => e.AssignedVehicleId == busNum).ArrivalTimeUTC).valueOf())
            console.log(arrivalTime)

            return arrivalTime - departureTime;
        })
        return time
}

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-82.8354);
  const [lat, setLat] = useState(34.6767);
  const [zoom, setZoom] = useState(14);

    const [busStops, setBusStops] = useState([])
    const [busRoutes, setBusRoutes] = useState([])



    const [busRoutesMap, setBusRoutesMap] = useState({})

    const [popup, setPopup] = useState(null);

    // Declare timerId using useRef
    const timerIdRef = useRef(null);

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


        const popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true
        })

        setPopup(popup)

  }, []);

    // Effect hook to fetch the bus routes data from the API
    useEffect(() => {
        fetch('https://api-my.app.clemson.edu/api/v0/map/bus/routes')
            .then(response => response.json())
            .then(data => {
                setBusStops(data.stops)
                //console.log(data.stops)
                setBusRoutes(data.routes)
                let map = {};

                Object.entries(data.routes).map(([key, value]) => {

                    value.stops.forEach( stop => {

                        value["route_id"] = key;

                        if (map[stop] == undefined) {
                            map[stop] = [];
                        }

                        map[stop].push(value);
                    })
                })

                setBusRoutesMap(map);

            })
            .catch(error => console.log(error));
    }, []);

    // Effect hook to update bustops on the boxmap
    useEffect ( () => {

        const routeColorMap = {
            'Red': 'red',
            'Blue': 'blue',
            'Green': 'green',
            // add more routes and colors here
        };

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


            const updatePopupInformation = () => {

                //console.log("updatePopupInformation method called")

                let description = `<div style="width: 180px;"><h3>${value.name}</h3></div>`;


                fetch('https://api-my.app.clemson.edu/api/v0/map/bus/arrivals/'+key)
                    .then(response => response.json())
                    .then(data => {

                        console.log("data", data, key)

                        if (busRoutesMap[key] == undefined) busRoutesMap[key] = []

                        busRoutesMap[key].forEach( busRoutesData => {

                            Object.entries(data).map(([arrivalTimeDataKey, arrivalTimeDataValue]) => {

                                //console.log("popup data: ", arrivalTimeDataValue, arrivalTimeDataKey, key, busRoutesData.route_id)

                                if (busRoutesData.route_id != arrivalTimeDataKey)
                                    return;

                                let timeDiffInMinutes = Number.MAX_SAFE_INTEGER;

                                arrivalTimeDataValue.forEach( arrivalTimeObj => {

                                    console.log("forEach Loop: ", arrivalTimeDataValue, timeDiffInMinutes, arrivalTimeObj)

                                    // get the current time
                                    const currentTime = new Date();

                                    // parse the arrival time from the API response
                                    const arrivalTime = new Date(arrivalTimeObj["arrival"]);

                                    // calculate the difference between the arrival time and the current time
                                    const timeDiff = arrivalTime.getTime() - currentTime.getTime();

                                    // convert the time difference from milliseconds to minutes
                                    const currentTimeDiffInMinutes = Math.round(timeDiff / 1000 / 60);

                                    console.log("timeDiffInMinutes1: ", currentTimeDiffInMinutes, timeDiffInMinutes)


                                    if (currentTimeDiffInMinutes > 0) {
                                        timeDiffInMinutes = Math.min(currentTimeDiffInMinutes, timeDiffInMinutes)
                                    }

                                    console.log("timeDiffInMinutes2: ", currentTimeDiffInMinutes, timeDiffInMinutes)

                                })

                                description += `<hr/><div style="display:flex; align-items:center;">`
                                    + `<div style="background-color:${routeColorMap[busRoutesData.name]}; border-radius:50%; width:10px; height:10px; margin-right:5px;"></div>`
                                    + `<div><b>${busRoutesData.name}</b></div>`
                                    + `<div style="margin-left:auto;">${timeDiffInMinutes} minutes</div>`
                                    + `</div>`;
                            })

                        })

                        // Change the cursor style as a UI indicator.
                        map.current.getCanvas().style.cursor = 'pointer';

                        // Populate the popup and set its coordinates
                        // based on the feature found.
                        if (popup.isOpen()) {

                            console.log("popup is open: ", description)

                            popup.setHTML(description);
                        } else {
                            console.log("popup is open else: ", description)
                            popup.setLngLat(busCoordinates).setHTML(description).addTo(map.current);
                        }


                    })
                    .catch(error => console.log(error));
            }

            markerEl.addEventListener('click', function () {

                updatePopupInformation();
                // Use setInterval() to update the content of the popup every 10 seconds
                timerIdRef.current = setInterval(() => {
                    console.log("Set Intervals")
                    updatePopupInformation();
                }, 10000);


                popup.on('close', () => {
                    console.log("clicked on popupclose eveent", timerIdRef.current);
                    clearInterval(timerIdRef.current);
                });

            });
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

  calculateBusRouteTime(3, 202, 205).then(routeTime => {
    console.log("Route time in milliseconds: " + routeTime)
  })

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