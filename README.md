
# 📇 Contact Manager

A modern, browser-based contact management web app that lets you:

- ✅ Upload contacts via VCF, Excel, or CSV
- ✨ Add/Edit/Delete contacts via a clean modal form
- 🔍 Search contacts instantly
- 📤 Export to `.vcf`, `.xlsx`, and `.ics` formats
- 📱 Generate QR codes for shared VCF links
- 🎂 Export birthday calendars to `.ics` files



- 📇 This web app can be used to manage emergency contact list that need to be maintained on a regular basis to ensure good internal communication.
- Try it [here](https://contact-list-updater.vercel.app/)
---

## 🚀 How to Use

1. **Clone or download the files** into a local folder:
   - `index.html`
   - `app.js`

2. **Open `index.html`** in any modern browser (Chrome, Edge, Firefox).

3. Start managing your contacts!

---

## 📁 File Structure

```bash
📂 your-folder/
│
├── index.html         # Main UI - Bootstrap styled, mobile-friendly
├── app.js             # All logic for upload, editing, exporting
└── README.md          # This file
```

---

## 📥 Upload Options

- **.vcf** (vCard 3.0): standard digital contact format
- **.xlsx** or **.csv**:
  - Columns: `Name`, `Phone`, `Email`, `Address`, `Birthday`
  - Example:

    | Name        | Phone       | Email              | Address          | Birthday   |
    |-------------|-------------|--------------------|------------------|------------|
    | Jane Doe    | 5551234567  | jane@example.com   | 123 Main St      | 1990-03-21 |

---

## ✨ Features

| Feature              | Description                                               |
|----------------------|-----------------------------------------------------------|
| 📥 File Upload        | Import contacts from `.vcf`, `.xlsx`, or `.csv`           |
| 🔍 Live Search        | Instantly filter contacts by name, phone, or email        |
| ➕ Modal Add/Edit     | Clean modal UI with validation                            |
| 📤 Export Options     | Export to VCF, Excel, or iCalendar birthday format        |
| 📅 Birthday Calendar  | One-click `.ics` file for importing birthdays to Outlook  |
| 📱 QR Code Generator  | Generate QR code to share hosted `.vcf` link              |

---

## 🛠 Dependencies

All loaded from CDN, no backend required:

- [Bootstrap 5](https://getbootstrap.com/)
- [SheetJS (xlsx)](https://github.com/SheetJS/sheetjs)
- [Google Chart API](https://developers.google.com/chart) for QR code

---

## 🧪 Future Improvements

- 🔄 Drag-and-drop upload support
- ☁️ Cloud sync with Google Drive / OneDrive
- 🌙 Dark mode toggle
- 📲 PWA (mobile installable)

---

## 🧑‍💻 Author

Developed by Sandiren Naiken for internal department use.  
For improvements or issues, please contact me.
