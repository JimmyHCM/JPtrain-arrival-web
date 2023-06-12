import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [arrivalTimes, setArrivalTimes] = useState({
    formattedMinowabashiArrivals: '',
    formattedWasedaArrivals: '',
  });

  useEffect(() => {
    const fetchArrivalTimes = async () => {
      const response = await fetch('http://localhost:3001/api/arrivalTimes');
      const data = await response.json();
      console.log(data);
      debugger;
      setArrivalTimes(data);
    };

    fetchArrivalTimes();
  }, []);

  return (
    <div className="App">
      <h1>Arakawa Line Train Arrival Times</h1>
      <div className="arrival-times">
        <pre>{arrivalTimes.formattedMinowabashiArrivals}</pre>
        <pre>{arrivalTimes.formattedWasedaArrivals}</pre>
      </div>
    </div>
  );
}

export default App;