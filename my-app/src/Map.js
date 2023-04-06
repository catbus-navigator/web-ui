import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import { AddressAutofill } from "@mapbox/search-js-react";
import moment from "moment";
import Instructions from "./Instructions";
moment().format();

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_KEY;

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-82.8354);
  const [lat, setLat] = useState(34.6767);
  const [zoom, setZoom] = useState(14);

  const [busStops, setBusStops] = useState([]);
  const [busRoutes, setBusRoutes] = useState([]);

  const [busRoutesMap, setBusRoutesMap] = useState({});

  const [popup, setPopup] = useState(null);

  const [steps, setSteps] = useState([]);

  // Declare timerId using useRef
  const timerIdRef = useRef(null);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: zoom,
    });

    // Add navigation control to the map
    map.current.addControl(
      new mapboxgl.NavigationControl({
        showZoom: true,
        showCompass: false,
        showCurrentLocation: true, // this enables the "Show my location" icon
        positionOptions: {
          enableHighAccuracy: true, // enable high accuracy for better location accuracy
        },
        visualizePitch: true,
      })
    );

    // Add geolocate control to the map
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true, // enable high accuracy for better location accuracy
        },
        fitBoundsOptions: {
          maxZoom: 15, // set a maximum zoom level when fitting the bounds
        },
      })
    );

    const popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
    });

    setPopup(popup);
  }, []);

  // Effect hook to fetch the bus routes data from the API
  useEffect(() => {
    fetch("https://api-my.app.clemson.edu/api/v0/map/bus/routes")
      .then((response) => response.json())
      .then((data) => {
        setBusStops(data.stops);
        setBusRoutes(data.routes);
        let map = {};

        Object.entries(data.routes).map(([key, value]) => {
          value.stops.forEach((stop) => {
            value["route_id"] = key;

            if (map[stop] == undefined) {
              map[stop] = [];
            }

            map[stop].push(value);
          });
        });

        setBusRoutesMap(map);
      })
      .catch((error) => console.error(error));
  }, []);

  // Effect hook to update bustops on the boxmap
  useEffect(() => {
    const routeColorMap = {
      Red: "red",
      Blue: "blue",
      Green: "green",
      // add more routes and colors here
    };

    Object.entries(busStops).map(([key, value]) => {
      const busCoordinates = [value.coordinate.lng, value.coordinate.lat];

      // Define the marker styling
      const markerEl = document.createElement("div");
      markerEl.style.background = "red";
      markerEl.style.border = "4px solid black";
      markerEl.style.width = "10px";
      markerEl.style.height = "10px";
      markerEl.style.borderRadius = "50%";

      // Create a new marker with the custom styling
      const marker = new mapboxgl.Marker({
        element: markerEl,
        anchor: "center",
      })
        .setLngLat(busCoordinates)
        .addTo(map.current);

      const updatePopupInformation = () => {
        //console.log("updatePopupInformation method called")

        let description = `<div style="width: 180px;"><h3>${value.name}</h3></div>`;

        fetch("https://api-my.app.clemson.edu/api/v0/map/bus/arrivals/" + key)
          .then((response) => response.json())
          .then((data) => {
            // console.log("data", data, key);

            if (busRoutesMap[key] == undefined) busRoutesMap[key] = [];

            busRoutesMap[key].forEach((busRoutesData) => {
              Object.entries(data).map(
                ([arrivalTimeDataKey, arrivalTimeDataValue]) => {
                  //console.log("popup data: ", arrivalTimeDataValue, arrivalTimeDataKey, key, busRoutesData.route_id)

                  if (busRoutesData.route_id != arrivalTimeDataKey) return;

                  let timeDiffInMinutes = Number.MAX_SAFE_INTEGER;

                  arrivalTimeDataValue.forEach((arrivalTimeObj) => {
                    // console.log(
                    //   "forEach Loop: ",
                    //   arrivalTimeDataValue,
                    //   timeDiffInMinutes,
                    //   arrivalTimeObj
                    // );

                    // get the current time
                    const currentTime = new Date();

                    // parse the arrival time from the API response
                    const arrivalTime = new Date(arrivalTimeObj["arrival"]);

                    // calculate the difference between the arrival time and the current time
                    const timeDiff =
                      arrivalTime.getTime() - currentTime.getTime();

                    // convert the time difference from milliseconds to minutes
                    const currentTimeDiffInMinutes = Math.round(
                      timeDiff / 1000 / 60
                    );

                    // console.log(
                    //   "timeDiffInMinutes1: ",
                    //   currentTimeDiffInMinutes,
                    //   timeDiffInMinutes
                    // );

                    if (currentTimeDiffInMinutes > 0) {
                      timeDiffInMinutes = Math.min(
                        currentTimeDiffInMinutes,
                        timeDiffInMinutes
                      );
                    }

                    // console.log(
                    //   "timeDiffInMinutes2: ",
                    //   currentTimeDiffInMinutes,
                    //   timeDiffInMinutes
                    // );
                  });

                  description +=
                    `<hr/><div style="display:flex; align-items:center;">` +
                    `<div style="background-color:${
                      routeColorMap[busRoutesData.name]
                    }; border-radius:50%; width:10px; height:10px; margin-right:5px;"></div>` +
                    `<div><b>${busRoutesData.name}</b></div>` +
                    `<div style="margin-left:auto;">${timeDiffInMinutes} minutes</div>` +
                    `</div>`;
                }
              );
            });

            // Change the cursor style as a UI indicator.
            map.current.getCanvas().style.cursor = "pointer";

            // Populate the popup and set its coordinates
            // based on the feature found.
            if (popup.isOpen()) {
              popup.setHTML(description);
            } else {
              popup
                .setLngLat(busCoordinates)
                .setHTML(description)
                .addTo(map.current);
            }
          })
          .catch((error) => console.error(error));
      };

      markerEl.addEventListener("click", function () {
        updatePopupInformation();
        // Use setInterval() to update the content of the popup every 10 seconds
        // timerIdRef.current = setInterval(() => {
        //     console.log("Set Intervals")
        //     updatePopupInformation();
        // }, 10000);

        // popup.on('close', () => {
        //     console.log("clicked on popupclose eveent", timerIdRef.current);
        //     clearInterval(timerIdRef.current);
        // });
      });
    });
  }, [busStops]);

  async function getNearestBusStops(data) {
    // console.log(data);
    let distancesFromStartingAddress = [];
    Object.entries(busStops).map(([dataKey, dataValue]) => {
      // console.log(dataValue);
      distancesFromStartingAddress.push([
        Math.sqrt(
          (data.features[0].center[1] - dataValue.coordinate.lat) ** 2 +
            (data.features[0].center[0] - dataValue.coordinate.lng) ** 2
        ),
        dataValue.coordinate.lat,
        dataValue.coordinate.lng,
        dataValue.name,
      ]);
    });
    distancesFromStartingAddress = distancesFromStartingAddress.sort((p1, p2) =>
      p1[0] < p2[0] ? 1 : p1[0] > p2[0] ? -1 : 0
    );
    while (distancesFromStartingAddress.length > 24) {
      distancesFromStartingAddress.shift();
    }
    let busStopAPIString = "";
    for (let i = 0; i < distancesFromStartingAddress.length; i++) {
      busStopAPIString +=
        distancesFromStartingAddress[i][2] +
        "," +
        distancesFromStartingAddress[i][1];
      if (i < distancesFromStartingAddress.length - 1) {
        busStopAPIString += ";";
      }
    }

    console.log(distancesFromStartingAddress);

    return fetch(
      "https://api.mapbox.com/directions-matrix/v1/mapbox/walking/" +
        data.features[0].center[0] +
        "," +
        data.features[0].center[1] +
        ";" +
        busStopAPIString +
        "?access_token=" +
        mapboxgl.accessToken
    ).then(async (response) => {
      const timeArray = await response.json();
      timeArray.durations[0][0] = Infinity;
      return timeArray;
    });
  }

  async function onCalculateHandler() {
    // Get addresses from input boxes
    const startingAddressArray = document
      .getElementById("startingAddress")
      .value.split(" ");
    const endingAddressArray = document
      .getElementById("endingAddress")
      .value.split(" ");
    // fetch lat and long for starting address
    const startGeodata = await fetch(
      "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
        startingAddressArray[0] +
        "%20" +
        startingAddressArray[1] +
        "%20" +
        startingAddressArray[2] +
        "%20" +
        startingAddressArray[3] +
        ".json?proximity=-82.83673382875219%2C34.676993908723304&access_token=" +
        mapboxgl.accessToken
    ).then(async (data) => {
      return data.json();
    });
    // let nearestBusStopCoords =
    //   timeArray.destinations[
    //     timeArray.durations[0].indexOf(Math.min(...timeArray.durations[0]))
    //   ].location;

    const endGeodata = await fetch(
      "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
        endingAddressArray[0] +
        "%20" +
        endingAddressArray[1] +
        "%20" +
        endingAddressArray[2] +
        "%20" +
        endingAddressArray[3] +
        ".json?proximity=-82.83673382875219%2C34.676993908723304&access_token=" +
        mapboxgl.accessToken
    ).then(async (data) => {
      return data.json();
    });

    const startingTimeArray = await getNearestBusStops(startGeodata);
    const endingTimeArray = await getNearestBusStops(startGeodata);

    console.log(startingTimeArray);
    console.log(endingTimeArray);
    //   .then((response2) => response2.json())
    //   .then((data2) => {
    //     // Hardcoded destination: MacAdams
    //     // TODO: use real destination
    //     // console.log(data.features[0].center);
    //     // console.log(nearestBusStopCoords);
    //     drawNavRoute(
    //       data.features[0].center,
    //       [-82.83452, 34.67555],
    //       {
    //         coords: nearestBusStopCoords,
    //       },
    //       {
    //         coords: [-82.83547, 34.67584],
    //       },
    //       undefined
    //     );
    //   });
    // });
  }

  // takes in a route ID, starting bus stop ID, and ending bus stop ID, and calculates the time to travel between them
  // assumes the next bus available is taken
  // Uses the catbus.ridesystems.net API, with ids taken from there
  // Returns time between the two stops in milliseconds
  async function calculateBusRouteTime(routeID, startingStopID, endingStopID) {
    const time = await fetch(
      "https://catbus.ridesystems.net/Services/JSONPRelay.svc/GetRouteStopArrivals"
    )
      .then((response) => response.json())
      .then((data) => {
        const startingStop = data.find(
          (e) => e.RouteStopID == startingStopID && e.RouteID == routeID
        );
        // console.log(startingStop);
        const busNum = startingStop.ScheduledTimes[0].AssignedVehicleId;
        const departureTime = moment
          .utc(startingStop.ScheduledTimes[0].DepartureTimeUTC)
          .valueOf();
        // console.log(departureTime);

        const endingStop = data.find(
          (e) => e.RouteStopID == endingStopID && e.RouteID == routeID
        );
        // console.log(endingStop);
        const arrivalTime = moment
          .utc(
            endingStop.ScheduledTimes.find((e) => e.AssignedVehicleId == busNum)
              .ArrivalTimeUTC
          )
          .valueOf();
        // console.log(arrivalTime);

        return arrivalTime - departureTime;
      });
    return time;
  }

  // calculateBusRouteTime(3, 202, 205).then((routeTime) => {
  //   console.log("Route time in milliseconds: " + routeTime);
  // });

  function drawNavRoute(start, end, busStop1, busStop2, busRoute) {
    let newSteps = [];

    fetch(
      "https://api.mapbox.com/directions/v5/mapbox/walking/" +
        start[0] +
        "%2C" +
        start[1] +
        "%3B" +
        busStop1.coords[0] +
        "%2C" +
        busStop1.coords[1] +
        "?alternatives=false&continue_straight=true&geometries=geojson&language=en&overview=simplified&steps=true&access_token=" +
        mapboxgl.accessToken
    )
      .then((response) => response.json())
      .then((data3) => {
        // console.log(data3);

        // draw path
        if (map.current.getSource("route")) {
          map.current.getSource("route").setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: data3.routes[0].geometry.coordinates,
            },
          });
        } else {
          map.current.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: data3.routes[0].geometry.coordinates,
              },
            },
          });
          map.current.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#888",
              "line-width": 8,
            },
          });
        }

        //add instructions
        newSteps = data3.routes[0].legs[0].steps;
        newSteps[newSteps.length - 1].maneuver.instruction = "Board the bus"; // TODO: give instructions for which bus to board

        fetch(
          "https://api.mapbox.com/directions/v5/mapbox/walking/" +
            busStop2.coords[0] +
            "%2C" +
            busStop2.coords[1] +
            "%3B" +
            end[0] +
            "%2C" +
            end[1] +
            "?alternatives=false&continue_straight=true&geometries=geojson&language=en&overview=simplified&steps=true&access_token=" +
            mapboxgl.accessToken
        )
          .then((response) => response.json())
          .then((data3) => {
            // console.log(data3);

            // draw path
            if (map.current.getSource("route2")) {
              map.current.getSource("route2").setData({
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: data3.routes[0].geometry.coordinates,
                },
              });
            } else {
              map.current.addSource("route2", {
                type: "geojson",
                data: {
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "LineString",
                    coordinates: data3.routes[0].geometry.coordinates,
                  },
                },
              });
              map.current.addLayer({
                id: "route2",
                type: "line",
                source: "route2",
                layout: {
                  "line-join": "round",
                  "line-cap": "round",
                },
                paint: {
                  "line-color": "#888",
                  "line-width": 8,
                },
              });
            }
            //add instructions
            newSteps.push({ maneuver: { instruction: "Get off at stop X" } });
            // console.log(data3.routes[0].legs[0].steps);
            newSteps = newSteps.concat(data3.routes[0].legs[0].steps);
            // console.log(newSteps);
            setSteps(newSteps);
          })
          .catch((error) => console.error(error));
      })
      .catch((error) => console.error(error));
  }

  return (
    <div className="Map">
      <div style={{ marginRight: "75%" }}>
        <form style={{ alignItems: "center", flexDirection: "column" }}>
          <label htmlFor="startingAddress">Starting Address: </label>
          <AddressAutofill accessToken={mapboxgl.accessToken}>
            <input
              id="startingAddress"
              name="startingAddress"
              autoComplete="shipping address-line1"
            ></input>
          </AddressAutofill>
        </form>
        <form style={{ alignItems: "center", flexDirection: "column" }}>
          <label htmlFor="endingAddress">Ending Address: </label>
          <AddressAutofill accessToken={mapboxgl.accessToken}>
            <input type="text" id="endingAddress" name="endingAddress"></input>
          </AddressAutofill>
        </form>
        <input
          type="button"
          value="Get Bus Directions!"
          onClick={onCalculateHandler}
        />
      </div>
      <div ref={mapContainer} className="map-container" />
      <Instructions props={steps} />
    </div>
  );
}
