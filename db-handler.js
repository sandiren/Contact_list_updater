const DB = {
  db: null,

  // Initializes the database, loading from session storage or creating a new one.
  async init() {
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });

    const dbData = sessionStorage.getItem('db');
    if (dbData) {
      try {
        const dbBuffer = new Uint8Array(dbData.split(',').map(Number));
        this.db = new SQL.Database(dbBuffer);
        console.log("Database loaded from session storage.");
      } catch (e) {
        console.error("Failed to load DB from session, creating new.", e);
        sessionStorage.removeItem('db');
        this.db = new SQL.Database();
        this.createSchema();
      }
    } else {
      console.log("No database in session storage. Creating a new one.");
      this.db = new SQL.Database();
      this.createSchema();
    }
    this.saveDbToSession(); // Ensure session is always populated on init
  },

  createSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT);
      INSERT OR IGNORE INTO users (id, username, password) VALUES (1, 'admin', 'password');
      CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE, email TEXT, address TEXT, birthday TEXT, is_active INTEGER DEFAULT 1);
      CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL);
      INSERT OR IGNORE INTO categories (name) VALUES ('Emergency'), ('Cyclone'), ('HOD'), ('Manager');
      CREATE TABLE IF NOT EXISTS contact_categories (contact_id INTEGER, category_id INTEGER, PRIMARY KEY (contact_id, category_id));
      CREATE TABLE IF NOT EXISTS custom_fields_definitions (id INTEGER PRIMARY KEY, field_name TEXT UNIQUE NOT NULL, field_type TEXT NOT NULL DEFAULT 'TEXT');
      CREATE TABLE IF NOT EXISTS custom_fields_values (id INTEGER PRIMARY KEY, contact_id INTEGER, field_id INTEGER, value TEXT);
    `;
    this.db.exec(schema);
    console.log("Database schema created.");
  },

  saveDbToSession() {
    if (!this.db) return;
    const data = this.db.export();
    sessionStorage.setItem('db', data.toString());
  },

  // For SELECT queries
  exec(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      const results = [];
      while (stmt.step()) { results.push(stmt.getAsObject()); }
      stmt.free();
      return results;
    } catch (err) {
      console.error(`Error executing SQL: ${sql}`, err);
      return [];
    }
  },

  // For UPDATE or DELETE queries
  run(sql, params = []) {
     try {
        this.db.run(sql, params);
        this.saveDbToSession();
        return { success: true };
     } catch(err) {
        console.error(`Error running SQL: ${sql}`, err);
        return { success: false, error: err };
     }
  },

  // For INSERT queries, returns the last inserted ID
  insert(sql, params = []) {
     try {
        this.db.run(sql, params);
        const res = this.exec('SELECT last_insert_rowid() as id');
        this.saveDbToSession();
        if (res.length > 0) {
            return { success: true, lastId: res[0].id };
        }
        return { success: false, error: new Error("Could not get last insert ID.") };
     } catch(err) {
        console.error(`Error inserting with SQL: ${sql}`, err);
        return { success: false, error: err };
     }
  },

  exportDb() {
    try {
      const data = this.db.export();
      const blob = new Blob([data], { type: "application/octet-stream" });
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = "contacts_database.db";
      a.click();
      window.URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("Failed to export database:", err);
    }
  },

  async importDb(file) {
    return new Promise((resolve, reject) => {
        if (!file) return reject("No file selected.");
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const SQL = await initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}` });
                this.db = new SQL.Database(new Uint8Array(event.target.result));
                this.saveDbToSession();
                resolve();
            } catch (err) { reject(err); }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
  }
};