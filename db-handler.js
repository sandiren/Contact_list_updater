const DB = {
  db: null,

  // Initializes the database engine and creates the schema
  async init() {
    try {
      const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
      });
      this.db = new SQL.Database();
      this.createSchema();
      console.log("Database initialized successfully.");
    } catch (err) {
      console.error("Failed to initialize database:", err);
      alert("Error: Could not load the database. Please check your internet connection and try again.");
    }
  },

  // Creates the necessary tables and default data
  createSchema() {
    const schema = `
      -- Users Table
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL -- In a real app, use a proper hash
      );
      -- Default User
      INSERT OR IGNORE INTO users (username, password) VALUES ('admin', 'password');

      -- Contacts Table
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        email TEXT,
        address TEXT,
        birthday TEXT,
        is_active INTEGER DEFAULT 1
      );

      -- Categories Table
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
      -- Default Categories
      INSERT OR IGNORE INTO categories (name) VALUES ('Emergency'), ('Cyclone'), ('HOD'), ('Manager');

      -- Linking Table for Contacts and Categories
      CREATE TABLE IF NOT EXISTS contact_categories (
        contact_id INTEGER,
        category_id INTEGER,
        PRIMARY KEY (contact_id, category_id),
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      );

      -- Custom Fields Definitions Table
      CREATE TABLE IF NOT EXISTS custom_fields_definitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field_name TEXT UNIQUE NOT NULL,
        field_type TEXT NOT NULL DEFAULT 'TEXT'
      );

      -- Custom Fields Values Table
      CREATE TABLE IF NOT EXISTS custom_fields_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER,
        field_id INTEGER,
        value TEXT,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (field_id) REFERENCES custom_fields_definitions(id) ON DELETE CASCADE
      );
    `;
    this.db.exec(schema);
    console.log("Database schema created.");
  },

  // Executes a query and returns the results
  // Note: This is a simplified helper. It returns results in a specific format.
  exec(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (err) {
      console.error(`Error executing SQL: ${sql}`, err);
      return [];
    }
  },

  // Executes a query that doesn't return data (INSERT, UPDATE, DELETE)
  run(sql, params = []) {
     try {
        this.db.run(sql, params);
        return { success: true };
     } catch(err) {
        console.error(`Error running SQL: ${sql}`, err);
        return { success: false, error: err };
     }
  },

  // Exports the database to a file
  exportDb() {
    try {
      const data = this.db.export();
      const blob = new Blob([data], { type: "application/octet-stream" });
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      const url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = "contacts_database.db";
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      console.log("Database exported successfully.");
    } catch (err) {
      console.error("Failed to export database:", err);
      alert("Error: Could not export the database.");
    }
  },

  // Imports a database from a file, replacing the current one
  async importDb(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject("No file selected.");
        }
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const SQL = await initSqlJs({
                    locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
                });
                this.db = new SQL.Database(new Uint8Array(event.target.result));
                console.log("Database imported successfully.");
                resolve();
            } catch (err) {
                console.error("Failed to import database:", err);
                alert("Error: The selected file is not a valid database file.");
                reject(err);
            }
        };
        reader.onerror = (err) => {
            console.error("File reading error:", err);
            reject(err);
        }
        reader.readAsArrayBuffer(file);
    });
  }
};