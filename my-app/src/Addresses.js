import React, { useRef, useEffect, useState} from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import { AddressAutofill } from '@mapbox/search-js-react';
 
// TO MAKE THE MAP APPEAR YOU MUST
// ADD YOUR ACCESS TOKEN FROM
// https://account.mapbox.com
const accessToken = process.env.REACT_APP_MAPBOX_KEY;

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
    <form style={{alignItems: "center", flexDirection: "column"}}>
      <label htmlFor="startingAddress">Starting Address:   </label>
      <AddressAutofill accessToken={accessToken}>
      <input id="startingAddress" name="startingAddress" autoComplete="shipping address-line1"></input>
      </AddressAutofill>
    </form>
    <div style={{alignItems: "center", flexDirection: "column"}}>
        <label htmlFor="endingAddress">Ending Address:   </label>
        <input type="text" id="endingAddress" name="endingAddress"></input>
    </div>

    <input type="button" value="Get Bus Directions!" onClick={onCalculateHandler}/>
    </div>
    </>
  );
}