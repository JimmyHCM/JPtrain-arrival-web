const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const port = 3001;

app.use(cors());

const fetchStationData = async () => {
  try {
    const apiUrl = 'https://api-public.odpt.org/api/v4/odpt:Station?odpt:operator=odpt.Operator:Toei';
    const response = await fetch(apiUrl);

    if (response.status === 200) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error(error);
  }

  return [];
};

const getStationName = (stationData, stationId) => {
  for (const station of stationData) {
    if (station['owl:sameAs'] === stationId) {
      return station['odpt:stationTitle']['ja'];
    }
  }
  return null;
};

const getDirectionSuffix = (stationId) => {
  if (stationId === 'odpt.Station:Toei.Arakawa.Waseda') {
    return '下り';
  } else if (stationId === 'odpt.Station:Toei.Arakawa.Minowabashi') {
    return '上り';
  }
  return null;
};

const getTrainArrivalTimes = async () => {
  try {
    const apiUrl = 'https://api-public.odpt.org/api/v4/odpt:StationTimetable?odpt:operator=odpt.Operator:Toei';
    const response = await fetch(apiUrl);

    if (response.status === 200) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error(error);
  }

  return [];
};

const buildTrainSchedule = (data) => {
  const trainSchedule = {
    Minowabashi: {
      Holiday: [],
      Saturday: [],
      Weekdays: [],
    },
    Waseda: {
      Holiday: [],
      Saturday: [],
      Weekdays: [],
    },
  };

  const mapCalendarToKey = (calendar) => {
    switch (calendar) {
      case 'odpt.Calendar:Holiday':
        return 'Holiday';
      case 'odpt.Calendar:Saturday':
        return 'Saturday';
      case 'odpt.Calendar:Weekday':
        return 'Weekdays';
      default:
        return null;
    }
  };

  data.forEach((item) => {
    const station = item['odpt:station'];
    const railDirection = item['odpt:railDirection'];
    const calendar = item['odpt:calendar'];

    if (station === 'odpt.Station:Toei.Arakawa.ShinKoshinzuka' && (railDirection === 'odpt.RailDirection:Toei.Minowabashi' || railDirection === 'odpt.RailDirection:Toei.Waseda')) {
      const x = railDirection.split(':')[1]; // Get either "Minowabashi" or "Waseda"
      const directionKey = x.split('.')[1];
      const calendarKey = mapCalendarToKey(calendar); // Get either "Holiday", "Saturday", or "Weekdays"

      if (calendarKey) {
        item['odpt:stationTimetableObject'].forEach((stationTimetableObject) => {
          trainSchedule[directionKey][calendarKey].push(stationTimetableObject['odpt:departureTime']);
        });
      }
    }
  });

  return trainSchedule;
};

const getArrivalTimesAt = (trainSchedule, time, direction, calendarKey) => {
  const times = [];
  trainSchedule[direction][calendarKey].forEach((arrivalTime) => {
    if (arrivalTime >= time) {
      times.push({
        direction,
        calendar: calendarKey,
        arrivalTime,
      });
    }
  });

  return times.slice(0, 4);
};

const getCalendarKeyForToday = () => {
  const today = new Date('June 4, 2023 23:15:30');
  const dayOfWeek = today.getDay(); // 0 (Sunday) to 6 (Saturday)

  if (dayOfWeek === 6) {
    return 'Saturday';
  } else if (dayOfWeek === 0) {
    return 'Holiday';
  } else {
    return 'Weekdays';
  }
};

const formatArrivalTimes = (arrivalTimes, direction) => {
  const formattedArrivalTimes = arrivalTimes.map((arrivalTime, index) => {
    const timeDifference = Math.ceil((new Date(`1970-01-01T${arrivalTime.arrivalTime}Z`) - new Date(`1970-01-01T07:45:00Z`)) / (1000 * 60));

    if (index === 0) {
      return `${direction} arriving (${arrivalTime.arrivalTime})`;
    } else {
      return `${direction} ${timeDifference} min(s) (${arrivalTime.arrivalTime})`;
    }
  });

  return formattedArrivalTimes.join('\n');
};

app.get('/api/arrivalTimes', async (req, res) => {
  const stationData = await fetchStationData();
  const data = await getTrainArrivalTimes();
  const trainSchedule = buildTrainSchedule(data);

  const desiredTime = '07:45';
  const directionMinowabashi = 'Minowabashi';
  const directionWaseda = 'Waseda';
  const calendarKey = getCalendarKeyForToday();

  const minowabashiArrivals = getArrivalTimesAt(trainSchedule, desiredTime, directionMinowabashi, calendarKey);
  const wasedaArrivals = getArrivalTimesAt(trainSchedule, desiredTime, directionWaseda, calendarKey);

  const minowabashiDirectionName = getStationName(stationData, 'odpt.Station:Toei.Arakawa.Minowabashi');
  const wasedaDirectionName = getStationName(stationData, 'odpt.Station:Toei.Arakawa.Waseda');

  const minowabashiDirectionSuffix = getDirectionSuffix('odpt.Station:Toei.Arakawa.Minowabashi');
  const wasedaDirectionSuffix = getDirectionSuffix('odpt.Station:Toei.Arakawa.Waseda');

  const formattedMinowabashiArrivals = formatArrivalTimes(minowabashiArrivals, `${minowabashiDirectionName} ${minowabashiDirectionSuffix}`);
  const formattedWasedaArrivals = formatArrivalTimes(wasedaArrivals, `${wasedaDirectionName} ${wasedaDirectionSuffix}`);

  const responseObj = {formattedMinowabashiArrivals,formattedWasedaArrivals};
  console.log('Response:', responseObj);
  res.json(responseObj);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});