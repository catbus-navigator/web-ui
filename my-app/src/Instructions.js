import React, { useRef, useEffect, useState } from "react";

export default function Instructions(props) {
  // console.log(props);
  const steps = props.props;
  // console.log(steps);
  const listItems = steps.map((step, i) => (
    <li key={i}>{step?.maneuver?.instruction}</li>
  ));

  return (
    <div id="instructions">
      <ul>{listItems}</ul>
    </div>
  );
}
