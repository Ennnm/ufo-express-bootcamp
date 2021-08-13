import express from 'express';
import methodOverride from 'method-override';
import { read, add, write } from './jsonFileStorage.mjs';

const app = express();
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
// overrid POST req with query param ?_method=PUT to be PUT requests

const splitDateTime = (dateTime) => dateTime.split('T');
const isDateInFuture = (date, time) => {
  const dateTime = [date, time].join('T');
  const testDate = new Date(dateTime);
  const now = new Date();
  const elapsed = now - testDate;
  return elapsed < 0;
};

const renderCreateForm = (req, res) => {
  console.log('rendering form');
  const emptyObj = {
    title: 'New sighting',
    action: '/sighting',
  };
  res.render('edit', emptyObj);
};
const isInputInvalid = (obj) => {
  // date check
  const alertObj = {
    ...obj,
    dateInFuture: true,
    err: '',
  };
  if (isDateInFuture(obj.date, obj.time))
  {
    alertObj.dateInFuture = true;
    alertObj.err = 'Inserted date, time is in the future.\n';
  }
  const keys = Object.keys(obj);
  const emptyKeys = keys.filter((key) => obj[key] === '');
  if (emptyKeys.length === 1) {
    alertObj.err += `${emptyKeys[0]} is empty`;
  }
  else if (emptyKeys.length !== 0) {
    alertObj.err += `${emptyKeys.join(', ')} are empty`;
  }
  if (alertObj.err !== '')
  {
    console.log(alertObj.err);
    return alertObj;
  }
};
const acceptCreation = (req, res) => {
  const obj = req.body;
  obj.date_time = [obj.date, obj.time].join('T');
  obj.reported = new Date();
  // date check
  if (isInputInvalid(obj))
  {
    const alertObj = {
      ...isInputInvalid(obj),
      title: 'New sighting',
      action: '/sighting',
    };
    res.render('edit', alertObj);
    return;
  }

  add('newSmallData.json', 'sightings', obj, (msg) => {
    read('newSmallData.json', (err, data) => {
      const { sightings } = data;
      res.redirect(`/sighting/${sightings.length - 1}`);
    });
  });
};

const renderSight = (req, res) => {
  read('newSmallData.json', (err, data) => {
    const { index } = req.params;
    const obj = {
      ...data.sightings[index],
      index,
      numEntries: data.sightings.length,
    };
    [obj.date, obj.time] = splitDateTime(obj.date_time);
    res.render('sighting', obj);
  });
};

const renderSights = (req, res) => {
  read('newSmallData.json', (err, data) => {
    const { sightings } = data;
    sightings.forEach((obj) => { [obj.date, obj.time] = splitDateTime(obj.date_time); });
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
  read('newSmallData.json', (err, data) => {
    const { index } = req.params;
    const currObj = data.sightings[index];
    // date reformatting
    [currObj.date, currObj.time] = currObj.date_time.split('T');
    currObj.date = formatDateString(currObj.date);

    const obj = {
      title: 'Edit',
      action: `/sighting/${index}/edit?_method=PUT`,
      ...currObj,
    };
    console.log(obj);
    res.render('edit', obj);
  });
};

const acceptEdit = (req, res) => {
  const { index } = req.params;
  const obj = req.body;
  if (isInputInvalid(obj))
  {
    const alertObj = {
      ...isInputInvalid(obj),
      title: 'Edit',
      action: `/sighting/${index}/edit?_method=PUT`,
    };
    res.render('edit', alertObj);
    return;
  }
  read('newSmallData.json', (err, data) => {
    data.sightings[index] = {
      ...obj,
      date_time: [obj.date, obj.time].join('T'),
    };
    console.log('in edit read');
    write('newSmallData.json', data, (err) => {
      if (err) console.log('write error');
      console.log('in edit write');
      console.log(data.sightings[index]);

      res.redirect(`/sighting/${index}`);
    });
  });
};

const acceptDelete = (req, res) => {
  read('newSmallData.json', (err, data) => {
    const { index } = req.params;
    data.sightings.splice(index, 1);
    console.log(index);
    write('newSmallData.json', data, (err) => {
      if (err) console.log('write error');
      res.redirect('/');
    });
  });
};

const renderShapes = (req, res) => {
  read('newSmallData.json', (err, data) => {
    const { sightings } = data;
    let shapeArr = sightings.map((sight) => sight.shape);
    shapeArr = shapeArr.filter((shape) => shape !== '');
    const shapeObjs = {
      shapes: new Set(shapeArr),
    };
    res.render('shapes', shapeObjs);
  });
};

const renderOneShape = (req, res) => {
  read('newSmallData.json', (err, data) => {
    const { shape } = req.params;
    const { sightings } = data;
    const sights = sightings.filter((x) => x.shape === shape);
    sights.forEach((obj) => { [obj.date, obj.time] = splitDateTime(obj.date_time); });
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
