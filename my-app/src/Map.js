import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import { AddressAutofill } from "@mapbox/search-js-react";
import moment from "moment";
import Instructions from "./Instructions";
import { resolveConfig } from "prettier";
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
  }, []);

  useEffect(() => {
    addMarkerAndPopup();
  }, [busStops]);

  const addMarkerAndPopup = () => {
    Object.entries(busStops).map(([key, value]) => {
      const busCoordinates = [value.coordinate.lng, value.coordinate.lat];

      const marker = getCustomMarker();

      marker.setLngLat(busCoordinates);
      marker.addTo(map.current);

      addClickEventListenerToMarker(marker, key, value);
    });
  };

  const addClickEventListenerToMarker = async (marker, key, value) => {
    marker.getElement().addEventListener("click", async () => {
      const estimatedArrivalTime = await getEstimatedArrivalTime(key, value);

      // Remove any previously opened popups
      const popups = document.querySelectorAll(".mapboxgl-popup");

      if (popups) popups.forEach((popup) => popup.remove());

      const lngLat = marker.getLngLat();

      const popup = new mapboxgl.Popup({ closeOnClick: false })
        .setLngLat(lngLat)
        .setHTML(estimatedArrivalTime)
        .addTo(map.current);

      // Update the popup text randomly every 10 seconds
      const popupInterval = setInterval(async () => {
        //const popupText = `New popup text: ${Math.random()}`;
        const estimatedArrivalTime = await getEstimatedArrivalTime(key, value);
        popup.setHTML(estimatedArrivalTime);
      }, 10000);

      popup.on("close", () => {
        clearInterval(popupInterval);
      });
    });
  };

  const getCustomMarker = () => {
    // Define the marker styling
    const markerEl = document.createElement("div");
    markerEl.style.background = "red";
    markerEl.style.border = "4px solid black";
    markerEl.style.width = "15px";
    markerEl.style.height = "15px";
    markerEl.style.borderRadius = "50%";

    // Create a new marker with the custom styling
    return new mapboxgl.Marker({
      element: markerEl,
      anchor: "center",
    });
  };

  const getEstimatedArrivalTime = async (key, value) => {
    //console.log("updatePopupInformation method called")

    const routeColorMap = {
      Red: "red",
      Blue: "blue",
      Green: "green",
      // add more routes and colors here
    };

    let description = `<div style="width: 180px;"><h3>${value.name}</h3></div>`;

    try {
      const response = await fetch(
        "https://api-my.app.clemson.edu/api/v0/map/bus/arrivals/" + key
      );
      const data = await response.json();

      if (busRoutesMap[key] === undefined) busRoutesMap[key] = [];

      busRoutesMap[key].forEach((busRoutesData) => {
        Object.entries(data).map(
          ([arrivalTimeDataKey, arrivalTimeDataValue]) => {
            if (busRoutesData.route_id !== arrivalTimeDataKey) return;

            let timeDiffInMinutes = Number.MAX_SAFE_INTEGER;

            arrivalTimeDataValue.forEach((arrivalTimeObj) => {
              // get the current time
              const currentTime = new Date();

              // parse the arrival time from the API response
              const arrivalTime = new Date(arrivalTimeObj["arrival"]);

              // calculate the difference between the arrival time and the current time
              const timeDiff = arrivalTime.getTime() - currentTime.getTime();

              // convert the time difference from milliseconds to minutes
              const currentTimeDiffInMinutes = Math.round(timeDiff / 1000 / 60);

              if (currentTimeDiffInMinutes > 0) {
                timeDiffInMinutes = Math.min(
                  currentTimeDiffInMinutes,
                  timeDiffInMinutes
                );
              }
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
    } catch (error) {
      console.error(error);
    }

    return description;
  };

  // Effect hook to fetch the bus routes data from the API
  useEffect(() => {
    fetch(
      "https://catbus.ridesystems.net/Services/JSONPRelay.svc/GetRoutesForMap"
    )
      .then((response) => response.json())
      .then((data) => {
        setBusRoutes(data);
      })
      .catch((error) => console.error(error));

    fetch("https://api-my.app.clemson.edu/api/v0/map/bus/routes")
      .then((response) => response.json())
      .then((data) => {
        setBusStops(data.stops);
        let map = {};

        Object.entries(data.routes).map(([key, value]) => {
          value.stops.forEach((stop) => {
            value["route_id"] = key;

            if (map[stop] == undefined) {
              map[stop] = [];
            }

            map[stop].push(value);
          });

          setBusRoutesMap(map);
        });
      })
      .catch((error) => console.error(error));
  }, []);

  async function getNearestBusStops(data) {
    let distancesFromStartingAddress = [];
    Object.entries(busRoutes).forEach(([key, route]) => {
      let distancesForRoute = [];
      let checkedStops = [];
      Object.entries(route.Stops).forEach(([key, stop]) => {
        if (!checkedStops.includes(stop.AddressID)) {
          checkedStops.push(stop.AddressID);
          distancesForRoute.push({
            dist: Math.sqrt(
              (data.features[0].center[1] - stop.Latitude) ** 2 +
                (data.features[0].center[0] - stop.Longitude) ** 2
            ),
            stop,
          });
        }
      });
      distancesForRoute = distancesForRoute.sort((p1, p2) => p1.dist - p2.dist);
      for (let i = 0; i < Math.min(3, distancesForRoute.length); i++) {
        distancesFromStartingAddress.push(distancesForRoute[i]);
      }
    });
    distancesFromStartingAddress = distancesFromStartingAddress.sort(
      (p1, p2) => p1.dist - p2.dist
    );
    // console.log(distancesFromStartingAddress);
    distancesFromStartingAddress.splice(10);
    let busStopAPIString = "";
    for (let i = 0; i < distancesFromStartingAddress.length; i++) {
      busStopAPIString +=
        distancesFromStartingAddress[i].stop.Longitude +
        "," +
        distancesFromStartingAddress[i].stop.Latitude;
      if (i < distancesFromStartingAddress.length - 1) {
        busStopAPIString += ";";
      }
    }

    // console.log(distancesFromStartingAddress);

    return fetch(
      "https://api.mapbox.com/directions-matrix/v1/mapbox/walking/" +
        data.features[0].center[0] +
        "," +
        data.features[0].center[1] +
        ";" +
        busStopAPIString +
        "?sources=0" +
        "&access_token=" +
        mapboxgl.accessToken
    ).then(async (response) => {
      const timeArray = await response.json();
      timeArray.durations[0][0] = Infinity;
      for (var i = 0; i < distancesFromStartingAddress.length; i++) {
        distancesFromStartingAddress[i].time = timeArray.durations[0][i + 1];
      }
      distancesFromStartingAddress = distancesFromStartingAddress.sort(
        (p1, p2) => p1.time - p2.time
      );
      return distancesFromStartingAddress;
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
    const endingTimeArray = await getNearestBusStops(endGeodata);

    const [RouteID, startingStop, endingStop] = await chooseBestRoute(
      startingTimeArray,
      endingTimeArray
    );

    drawNavRoute(
      startGeodata.features[0].center,
      endGeodata.features[0].center,
      startingStop,
      endingStop,
      RouteID
    );
  }

  async function chooseBestRoute(startingArray, endingArray) {
    var minTime = Infinity;
    var minRouteID, minStartStop, minEndStop;
    for (var i = 0; i < startingArray.length; i++) {
      for (var j = 0; j < endingArray.length; j++) {
        if (startingArray[i].stop.RouteID !== endingArray[j].stop.RouteID)
          continue;

        const busTime = await calculateBusRouteTime(
          startingArray[i].stop.RouteID,
          startingArray[i].stop.RouteStopID,
          endingArray[j].stop.RouteStopID
        );
        const time = busTime + startingArray[i].time + endingArray[j].time;
        if (time < minTime) {
          minTime = time;
          minRouteID = startingArray[i].stop.RouteID;
          minStartStop = startingArray[i].stop;
          minEndStop = endingArray[j].stop;
        }
      }
    }
    return [minRouteID, minStartStop, minEndStop];
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
          (e) => e.RouteStopID === startingStopID && e.RouteID === routeID
        );
        if (startingStop === undefined) return Infinity;
        if (!startingStop.ScheduledTimes[0]) return Infinity;
        const busNum = startingStop.ScheduledTimes[0].AssignedVehicleId;
        const departureTime = moment
          .utc(startingStop.ScheduledTimes[0].DepartureTimeUTC)
          .valueOf();

        const endingStop = data.find(
          (e) => e.RouteStopID === endingStopID && e.RouteID === routeID
        );
        if (endingStop === undefined) return Infinity;

        const endStopSchedule = endingStop.ScheduledTimes.filter(
          (e) => e.AssignedVehicleId === busNum
        ).find((e) => moment.utc(e.ArrivalTimeUTC).valueOf() > departureTime);
        if (endStopSchedule === undefined) return Infinity;

        const arrivalTime = moment
          .utc(endStopSchedule.ArrivalTimeUTC)
          .valueOf();
        const time = (arrivalTime - departureTime) / 1000.0;
        return time;
      });
    return time;
  }

  function drawNavRoute(start, end, busStop1, busStop2, RouteID) {
    let newSteps = [];

    fetch(
      "https://api.mapbox.com/directions/v5/mapbox/walking/" +
        start[0] +
        "%2C" +
        start[1] +
        "%3B" +
        busStop1.Longitude +
        "%2C" +
        busStop1.Latitude +
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
        //Finds name of the bus route
        let i;
        let busRouteName;
        let busRouteIndex;
        for (i = 0; i < busRoutes.length; i++) {
          if (busRoutes[i].RouteID == RouteID) {
            busRouteName = busRoutes[i].Description + " Route";
            busRouteIndex = i;
          }
        }
        newSteps = data3.routes[0].legs[0].steps;
        newSteps[newSteps.length - 1].maneuver.instruction =
          "Board the " + busRouteName;

        //add busroutes visualization
        let busRouteCoordinates = [];
        busRouteCoordinates.push([busStop1.Longitude, busStop1.Latitude]);
        let j;
        for (j = 0; j < busRoutes[busRouteIndex].Stops.length; j++) {
          if (
            busRoutes[busRouteIndex].Stops[j].AddressID == busStop1.AddressID
          ) {
            while (
              busRoutes[busRouteIndex].Stops[j].AddressID != busStop2.AddressID
            ) {
              let k;
              for (
                k = 0;
                k < busRoutes[busRouteIndex].Stops[j].MapPoints.length;
                k++
              ) {
                busRouteCoordinates.push([
                  busRoutes[busRouteIndex].Stops[j].MapPoints[k].Longitude,
                  busRoutes[busRouteIndex].Stops[j].MapPoints[k].Latitude,
                ]);
              }
              j += 1;
            }
          }
        }
        busRouteCoordinates.push([busStop2.Longitude, busStop2.Latitude]);
        //add busroute path
        if (map.current.getSource("busRoute")) {
          map.current.getSource("busRoute").setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: busRouteCoordinates,
            },
          });
        } else {
          map.current.addSource("busRoute", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: busRouteCoordinates,
              },
            },
          });
          map.current.addLayer({
            id: "busRoute",
            type: "line",
            source: "busRoute",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#bd0026",
              "line-width": 8,
            },
          });
        }

        fetch(
          "https://api.mapbox.com/directions/v5/mapbox/walking/" +
            busStop2.Longitude +
            "%2C" +
            busStop2.Latitude +
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
            newSteps.push({
              maneuver: {
                instruction: "Get off at stop " + busStop2.Description,
              },
            });
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
