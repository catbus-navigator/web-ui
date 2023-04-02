import React, { useRef, useEffect, useState } from "react";

// TO MAKE THE MAP APPEAR YOU MUST
// ADD YOUR ACCESS TOKEN FROM
// https://account.mapbox.com
const accessToken = process.env.REACT_APP_MAPBOX_KEY;

export default function GenerateDirections() {
  const [startingAddress, setStartingAddress] = useState("");
  const [endingAddress, setEndingAddress] = useState("");

  var MapBoxDirections = require("@mapbox/mapbox-gl-directions");

  var directions = new MapboxDirections({
    accessToken: "YOUR-MAPBOX-ACCESS-TOKEN",
    unit: "metric",
    profile: "mapbox/cycling",
  });

  return <></>;
}
