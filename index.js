import express from 'express';
import methodOverride from 'method-override';
import { read, add, write } from './jsonFileStorage.mjs';

const app = express();
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
// overrid POST req with query param ?_method=PUT to be PUT requests

const renderCreateForm = (req, res) => {
  console.log('rendering form');
  const emptyObj = {
  };
  console.log(emptyObj);
  res.render('creation');
};

const acceptCreation = (req, res) => {
  const obj = req.body;
  obj.date_time = `${obj.date} ${obj.time}`;
  obj.reported = new Date();
  ['date', 'time'].forEach((k) => delete obj[k]);
  add('data.json', 'sightings', obj, (msg) => {
    console.log(msg);
    read('data.json', (err, data) => {
      const { sightings } = data;
      res.redirect(`/sighting/${sightings.length - 1}`);
    });
  });
};
const renderSight = (req, res) => {
  read('data.json', (err, data) => {
    const { index } = req.params;
    const obj = {
      ...data.sightings[index],
      index,
      numEntries: data.sightings.length,
    };
    res.render('sighting', obj);
  });
};

const renderSights = (req, res) => {
  read('data.json', (err, data) => {
    res.render('index', data);
  });
};

const formatDateString = (dateStr) => {
  const regex = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
  const found = regex.exec(dateStr);
  if (found) {
    let [, day, month, year] = found;
    if (day.length < 2) day = `0${day}`;
    if (month.length < 2) month = `0${month}`;
    if (year.length < 4) year = `20${year}`;
    return [year, month, day].join('-');
  }
  return dateStr;
};
const renderEditForm = (req, res) => {
  // read
  read('data.json', (err, data) => {
    const { index } = req.params;
    const currObj = data.sightings[index];
    // date reformatting
    [currObj.date, currObj.time] = currObj.date_time.split(' ');
    currObj.date = formatDateString(currObj.date);

    const obj = {
      ...currObj,
      index,
    };
    console.log(`${obj} in edit form`);
    res.render('edit', obj);
  });
};

const acceptEdit = (req, res) => {
  read('data.json', (err, data) => {
    const { index } = req.params;

    data.sightings[index] = {
      ...req.body,
      date_time: `${req.body.date} ${req.body.time}`,
    };
    console.log(data.sightings[index]);
    write('data.json', data, (err) => {
      if (err) console.log('write error');
      res.redirect(`/sighting/${index}`);
    });
  });
};

const acceptDelete = (req, res) => {
  read('data.json', (err, data) => {
    const { index } = req.params;
    data.sightings.splice(index, 1);
    console.log(index);
    write('data.json', data, (err) => {
      if (err) console.log('write error');
      res.redirect('/');
    });
  });
};

const renderShapes = (req, res) => {
  read('data.json', (err, data) => {
    const { sightings } = data;
    const shapeArr = sightings.map((sight) => sight.shape);
    const shapeObjs = {
      shapes: new Set(shapeArr),
    };
    res.render('shapes', shapeObjs);
  });
};

const renderOneShape = (req, res) => {
  read('data.json', (err, data) => {
    const { shape } = req.params;
    const { sightings } = data;
    const sights = sightings.filter((x) => x.shape === shape);
    const shapeObjs = {
      sightings: sights,
    };
    res.render('index', shapeObjs);
  });
};
app.get('/sighting', renderCreateForm);
app.post('/sighting', acceptCreation);

app.get('/sighting/:index', renderSight);
app.get('/', renderSights);

app.get('/sighting/:index/edit', renderEditForm);
app.put('/sighting/:index/edit', acceptEdit);

app.delete('/sighting/:index/delete', acceptDelete);

app.get('/shapes', renderShapes);
app.get('/shapes/:shape', renderOneShape);

app.listen(3004);
