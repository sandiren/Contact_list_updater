# 📇 HR Contact Manager

A powerful, private, and offline-first contact management web app designed for HR departments. It runs entirely in your browser and uses an in-browser SQLite database to store all your data securely on your machine.

**Key Features:**
- **🔒 Secure & Private:** No data ever leaves your computer. Everything is stored and processed locally.
- **💾 Persistent Data:** Save your entire contact database to a single file and load it back anytime.
- **👤 User Login:** Protects access to the contact list with a simple login system.
- **🏷️ Dynamic Categories:** Create and manage custom categories (e.g., "Emergency," "HOD," "Manager") and assign contacts to multiple categories.
- **✨ Custom Fields:** Add custom fields to your contacts to store any information you need (e.g., "Department," "Job Title," "Start Date").
- **📦 Bulk Actions:** Select multiple contacts to archive, un-archive, or assign to a category all at once.
- **📱 QR Code Sharing:** Instantly generate a QR code that contains the contact details of all active employees in a downloadable `.vcf` file.

---

## 🚀 How to Use

This application runs entirely in your browser. No server or internet connection is required after the initial load.

1.  **Open `login.html`** in any modern browser (Chrome, Edge, Firefox).

2.  **Log In:**
    *   For the very first use, log in with the default credentials:
        *   **Username:** `admin`
        *   **Password:** `password`

3.  **IMPORTANT: How to Save Your Work**
    *   The application stores data in your browser's memory. To save your contacts permanently, you **must** export the database.
    *   **To Save:** Click the **"Export Database"** button on the main page. This will download a `contacts_database.db` file to your computer. Keep this file safe!
    *   **To Load:** The next time you use the app, click the **"Import and Initialize"** button on the `login.html` page and select your saved `.db` file. You can then log in and all your data will be there.

4.  **Manage Contacts:** Once logged in, you can add, edit, archive, and manage your contacts, categories, and custom fields.

---

## 📁 File Structure

```bash
📂 your-folder/
│
├── login.html         # Login page
├── index.html         # Main application UI
├── app.js             # Core application logic and UI interactions
├── db-handler.js      # Manages the in-browser SQLite database
└── README.md          # This file
```

---

## 🛠 Dependencies

All dependencies are loaded from a CDN, requiring no local installation.

- [Bootstrap 5](https://getbootstrap.com/): For the user interface.
- [sql.js](https://github.com/sql-js/sql.js): For running SQLite in the browser.
- [Google Chart API](https://developers.google.com/chart): For generating QR codes.

---

## 🧑‍💻 Author

Developed by Sandiren Naiken for internal department use.  
For improvements or issues, please contact me.