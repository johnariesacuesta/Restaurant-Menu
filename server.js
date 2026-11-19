
const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL || !process.env.ADMIN_PASSWORD) {
  throw new Error("DATABASE_URL and ADMIN_PASSWORD are required.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      description TEXT DEFAULT '',
      category VARCHAR(50) NOT NULL,
      price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
      image TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const count = await pool.query(
    "SELECT COUNT(*) FROM menu_items"
  );

 if (Number(count.rows[0].count) === 0) {
  await pool.query(`
    INSERT INTO menu_items
    (name, description, category, price, image)
    VALUES
    ('Cheeseburger', 'Juicy beef burger with cheese', 'Meals', 120, '/images/burger.jpg'),
    ('Pepperoni Pizza', 'Classic pepperoni pizza', 'Meals', 280, '/images/pizza.jpg'),
    ('French Fries', 'Crispy golden fries', 'Snacks', 80, '/images/fries.jpg'),
    ('Fried Chicken', 'Crispy fried chicken meal', 'Meals', 150, '/images/chicken.jpg'),
    ('Spaghetti', 'Filipino style spaghetti', 'Meals', 110, '/images/spaghetti.jpg')
  `);
}
}
function adminOnly(req, res, next) {
  const password = req.headers["x-admin-password"];

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Admin login required."
    });
  }

  next();
}

// Public menu
app.get("/api/menu", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM menu_items ORDER BY created_at DESC"
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Could not load menu." });
  }
});

// Admin login check
app.post("/api/admin/login", adminOnly, (req, res) => {
  res.json({ success: true, message: "Admin login successful." });
});

// Add menu item
app.post("/api/menu", adminOnly, async (req, res) => {
  const { name, description, category, price, image } = req.body;

  if (!name?.trim() || !category?.trim() ||
      !Number.isFinite(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ message: "Invalid menu details." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO menu_items
       (name, description, category, price, image)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), description || "", category.trim(),
       Number(price), image || ""]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Could not add item." });
  }
});

// Edit menu item
app.put("/api/menu/:id", adminOnly, async (req, res) => {
  const { name, description, category, price, image } = req.body;

  if (!name?.trim() || !category?.trim() ||
      !Number.isFinite(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ message: "Invalid menu details." });
  }

  try {
    const result = await pool.query(
      `UPDATE menu_items SET
       name=$1, description=$2, category=$3, price=$4, image=$5
       WHERE id=$6 RETURNING *`,
      [name.trim(), description || "", category.trim(),
       Number(price), image || "", req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Item not found." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Could not update item." });
  }
});

// Delete menu item
app.delete("/api/menu/:id", adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM menu_items WHERE id=$1",
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Item not found." });
    }

    res.json({ success: true, message: "Item deleted." });
  } catch (error) {
    res.status(500).json({ message: "Could not delete item." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Restaurant menu running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });
