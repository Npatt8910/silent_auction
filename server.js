const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

let bids = [];

// Load existing bids
if (fs.existsSync('bids.json')) {
  bids = JSON.parse(fs.readFileSync('bids.json'));
}

// Home page (car listing + bid form)
app.get('/', (req, res) => {
  res.render('index');
});

// Handle bid submission
app.post('/submit-bid', (req, res) => {
  const { name, email, amount } = req.body;
  bids.push({ name, email, amount: parseFloat(amount), timestamp: new Date() });
  fs.writeFileSync('bids.json', JSON.stringify(bids, null, 2));
  res.send('Bid submitted successfully! You’ll hear from us if you win.');
});

// Admin view (simple password protection)
app.get('/admin', (req, res) => {
  const { password } = req.query;
  if (password !== 'yourSecretPassword') {
    return res.status(403).send('Access denied');
  }
  const sortedBids = bids.sort((a, b) => b.amount - a.amount);
  res.render('admin', { bids: sortedBids });
});

app.listen(PORT, () => {
  console.log(`Silent auction running at http://localhost:${PORT}`);
});
const carPath = path.join(__dirname, 'car.json');

// Admin dashboard
app.get('/admin', (req, res) => {
  const { password } = req.query;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).send('Access denied');
  }

  const car = JSON.parse(fs.readFileSync(carPath));
  const sortedBids = bids.sort((a, b) => b.amount - a.amount);
  res.render('admin', { car, bids: sortedBids });
});

// Handle car info update
app.post('/admin/update-car', (req, res) => {
  const { title, description, minBid, imageUrl, password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).send('Access denied');
  }

  const updatedCar = { title, description, minBid: parseFloat(minBid), imageUrl };
  fs.writeFileSync(carPath, JSON.stringify(updatedCar, null, 2));
  res.redirect(`/admin?password=${password}`);
});
app.post('/submit-bid', (req, res) => {
  const { name, email, amount } = req.body;
  const car = JSON.parse(fs.readFileSync(carPath));

  const bidAmount = parseFloat(amount);
  const minBid = parseFloat(car.minBid);

  // Check minimum bid
  if (bidAmount < minBid) {
    return res.status(400).send(`Bid must be at least $${minBid}`);
  }

  // Check $25 increment
  if ((bidAmount - minBid) % 25 !== 0) {
    return res.status(400).send('Bids must increase in $25 increments');
  }

  bids.push({ name, email, amount: bidAmount });
  res.redirect('/thank-you');
});

