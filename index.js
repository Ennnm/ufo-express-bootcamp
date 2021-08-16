import express from 'express';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import moment from 'moment';
import { read, add, write } from './jsonFileStorage.mjs';

const app = express();
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
app.use(cookieParser());

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
    inputErr: true,
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

const favCookieHandler = (req, res) => {
  const { fav } = req.query;
  const { index } = req.params;
  let favs = [];

  if (req.cookies.fav)
  {
    favs = req.cookies.fav;
  }
  if (fav === 'true')
  {
    if (favs.indexOf(index) < 0) {
      favs.push(index);
    }
  }
  else if (fav === 'false')
  {
    if (favs.indexOf(index) >= 0) {
      favs.splice(favs.indexOf(index), 1);
    }
  }
  res.cookie('fav', favs);
};

const renderSight = (req, res) => {
  const { index } = req.params;
  favCookieHandler(req, res);

  read('newSmallData.json', (err, data) => {
    const chosenObj = data.sightings.filter((x) => x.id === Number(index))[0];
    const obj = {
      ...chosenObj,
      index,
      numEntries: data.sightings.length,
      fav: req.cookies.fav ? req.cookies.fav.indexOf(index) >= 0 : false,
    };
    console.log(obj);
    [obj.date, obj.time] = splitDateTime(obj.date_time);
    obj.fromNow = moment(obj.date_time).fromNow();
    obj.moment = moment(obj.date_time).format('dddd, MMMM Do YYYY, h:mm:ss a');
    res.render('sighting', obj);
  });
};

const visitorTracker = (req, res) => {
  let visits = 0;
  let uniqueVisitors = 0;
  // check if it's not the first time a request has been made
  if (req.cookies.visits) {
    visits = Number(req.cookies.visits); // get the value from the request
  }
  if (req.cookies.uniqueVisitors)
  {
    uniqueVisitors = Number(req.cookies.uniqueVisitors);
  }
  if (visits === 0)
  {
    uniqueVisitors += 1;
  }
  // set a new value of the cookie
  visits += 1;
  // expires visit after everyday
  res.cookie('visits', visits, { expires: new Date(Date.now() + 24 * 3600000) });
  // set a new value to send back
  res.cookie('uniqueVisitors', uniqueVisitors, { expires: new Date(Date.now() + 24 * 30 * 3600000) });
  return uniqueVisitors;
};

const renderSights = (req, res) => {
  read('newSmallData.json', (err, data) => {
    const { sightings } = data;
    sightings.forEach((obj, index) => {
      [obj.date, obj.time] = splitDateTime(obj.date_time);
      obj.fromNow = moment(obj.date_time).fromNow();
      obj.moment = moment(obj.date_time).format('dddd, MMMM Do YYYY, h:mm:ss a');
    });
    data.numVisitors = visitorTracker(req, res);

    res.render('index', data);
  });
};

const renderPrevSight = (req, res) => {
  read('newSmallData.json', (err, data) => {
    const { index } = req.params;
    const currIdInSghtgs = data.sightings.findIndex((obj) => obj.id === Number(index));
    if (currIdInSghtgs > 0) {
      res.redirect(`/sighting/${currIdInSghtgs - 1}`);
    }
  });
};

const rendernextSight = (req, res) => {
  read('newSmallData.json', (err, data) => {
    const { index } = req.params;
    const currIdInSghtgs = data.sightings.findIndex((obj) => obj.id === Number(index));
    if (currIdInSghtgs < data.sightings.length - 1) {
      res.redirect(`/sighting/${currIdInSghtgs + 1}`);
    }
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
    const currObj = data.sightings.filter((obj) => obj.id === Number(index))[0];
    console.log(currObj);
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
      id: Number(index),
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
    sights.forEach((obj) => {
      [obj.date, obj.time] = splitDateTime(obj.date_time);
      obj.fromNow = moment(obj.date_time).fromNow();
      obj.moment = moment(obj.date_time).format('dddd, MMMM Do YYYY, h:mm:ss a');
    });
    const shapeObjs = {
      sightings: sights,
    };
    res.render('index', shapeObjs);
  });
};
const renderFavs = (req, res) => {
  read('newSmallData.json', (err, data) => {
    let fav = [];
    const { sightings } = data;
    if (req.cookies.fav) {
      fav = req.cookies.fav;
    }
    console.log(fav);

    const sights = [];
    fav.forEach((id) => sights.push(sightings[id]));

    sights.forEach((obj) => {
      [obj.date, obj.time] = splitDateTime(obj.date_time);
      obj.fromNow = moment(obj.date_time).fromNow();
      obj.moment = moment(obj.date_time).format('dddd, MMMM Do YYYY, h:mm:ss a');
    });
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

app.get('/sighting/:index/prev', renderPrevSight);
app.get('/sighting/:index/next', rendernextSight);

app.get('/sighting/:index/edit', renderEditForm);
app.put('/sighting/:index/edit', acceptEdit);

app.delete('/sighting/:index/delete', acceptDelete);

app.get('/shapes', renderShapes);
app.get('/shapes/:shape', renderOneShape);

app.get('/favs', renderFavs);

app.get('/sighting/:index');
app.listen(3004);
