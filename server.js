const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const DB_FILE = 'db.json';

// Read DB
function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE));
}

// Write DB
function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Get all books
app.get('/books', (req, res) => {
    const data = readDB();
    res.json(data.books);
});

// Add book
app.post('/books', (req, res) => {
    const data = readDB();
    const newBook = { id: Date.now(), ...req.body, status: "available" };
    data.books.push(newBook);
    writeDB(data);
    res.json(newBook);
});

// Issue book
app.post('/issue/:id', (req, res) => {
    const data = readDB();
    const book = data.books.find(b => b.id == req.params.id);

    if (book && book.status === "available") {
        book.status = "issued";
        writeDB(data);
        res.json({ message: "Book issued" });
    } else {
        res.json({ message: "Book not available" });
    }
});

// Return book
app.post('/return/:id', (req, res) => {
    const data = readDB();
    const book = data.books.find(b => b.id == req.params.id);

    if (book && book.status === "issued") {
        book.status = "available";
        writeDB(data);
        res.json({ message: "Book returned" });
    } else {
        res.json({ message: "Invalid action" });
    }
});

app.listen(3000, '0.0.0.0', () => {
    console.log("Server running on http://localhost:3000");
});