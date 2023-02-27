import React, { useRef, useEffect, useState} from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_KEY

export default function Addresses() {

  const [startingAddress, setStartingAddress] = useState("");
  const [endingAddress, setEndingAddress] = useState("");

  function onCalculateHandler(){
    setStartingAddress(document.getElementById('startingAddress').value)
    setEndingAddress(document.getElementById('endingAddress').value)
  }

  return (
    <>
    <div style={{marginRight: "75%"}}>
    <div style={{alignItems: "center", flexDirection: "column"}}>
      <label htmlFor="startingAddress">Starting Address:   </label>
      <input type="text" id="startingAddress" name="startingAddress"></input>
    </div>
    <div style={{alignItems: "center", flexDirection: "column"}}>
        <label htmlFor="endingAddress">Ending Address:   </label>
        <input type="text" id="endingAddress" name="endingAddress"></input>
    </div>

    <input type="button" value="Get Bus Directions!" onClick={onCalculateHandler}/>
    </div>
    </>
  );
}