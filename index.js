import express from 'express';
import methodOverride from 'method-override';
import { read, add, write } from './jsonFileStorage.mjs';

const app = express();
app.set('view engine', 'ejs');
app.get(methodOverride('_method'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
// overrid POST req with query param ?_method=PUT to be PUT requests

const renderCreateForm = (req, res) => {
  console.log('rendering form');
  res.render('creation');
};

const acceptCreation = (req, res) => {
  const obj = req.body;
  obj.date_time = `${obj.date} ${obj.time}`;
  obj.duration = `${obj.duration} minutes`;
  ['date', 'time', 'duration'].forEach((k) => delete obj[k]);

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
    };
    res.render('sighting', obj);
  });
};

const renderSights = (req, res) => {
  read('data.json', (err, data) => {
    res.render('index', data);
  });
};
app.get('/sighting', renderCreateForm);
app.post('/sighting', acceptCreation);

app.get('/sighting/:index', renderSight);
app.get('/', renderSights);

// app.get('/sighting/:index/edit', renderEditForm);
// // /recipe/1?_method=PUT
// app.put('/sighting/:index/edit', acceptEdit);

// app.delete('/sighting/:index/delete', acceptDelete);

// app.get('/shapes', renderSightShapes);
// app.get('/shapes/:shape', renderSightOneShape);

app.listen(3004);
