import { read, write } from './jsonFileStorage.mjs';

read('newbigdata.json', (err, data) => {
  const { sightings } = data;
  data.sightings = sightings.splice(0, 100);
  data.sightings.forEach((obj, index) => {
    obj.id = index;
    console.log(index);
  });
  write('newSmallData.json', data, (err, content) => {
    console.log(err);
  });
});
