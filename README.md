# 📇 HR Contact Manager (Supabase Version)

A powerful, private, and scalable contact management web app designed for HR departments. This version uses **Supabase** for its backend, providing a robust database, secure user authentication, and reliable data management.

**Key Features:**
- **🔒 Secure User Authentication:** Sign up and log in with email and password, all handled securely by Supabase Auth.
- **☁️ Centralized Cloud Database:** All contact data is stored in a Supabase PostgreSQL database, accessible from anywhere.
- **🏷️ Dynamic Categories:** Create and manage custom categories (e.g., "Emergency," "HOD," "Manager") and assign contacts to multiple categories.
- **✨ Custom Fields:** Add custom fields to your contacts to store any information you need (e.g., "Department," "Job Title," "Start Date").
- **📦 Bulk Actions:** Select multiple contacts to archive, un-archive, or assign to a category all at once.
- **🔄 Excel Import/Export:** Easily import new contacts from an Excel file (`.xlsx` or `.csv`) and export your entire contact list to Excel or VCF format.
- **📱 QR Code Sharing:** Instantly generate a QR code for all active employees, which links to a downloadable `.vcf` file.

---

## 🚀 How to Set Up and Run

### 1. Set Up Your Supabase Project

- If you haven't already, create a project on [Supabase](https://supabase.com/).
- In your Supabase project, go to the **SQL Editor** and run the table creation script provided during our setup conversation. This will create all the necessary tables (`contacts`, `categories`, etc.).

### 2. Configure Your Credentials (Important & Secure)

- In the project's root directory, you will find a file named `supabase-client.js.example`.
- **Make a copy** of this file and rename the copy to `supabase-client.js`.
- Open `supabase-client.js` and replace the placeholder values with your actual Supabase **URL** and **anon key**. You can find these in your Supabase project under **Project Settings > API**.

```javascript
// supabase-client.js

const { createClient } = supabase;

// Replace with your own Supabase credentials
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

// Initialize the Supabase client
const _supabase = createClient(supabaseUrl, supabaseKey);
```

**Note:** The `supabase-client.js` file is listed in `.gitignore`, so your secret keys will **not** be committed to version control.

### 3. Run the Application

- Simply open the `login.html` file in any modern web browser (like Chrome, Firefox, or Edge).
- Create an account using the "Sign Up" link.
- Log in and start managing your contacts!

---

## 📁 File Structure

```bash
.
├── login.html
├── index.html
├── app.js
├── supabase-client.js.example  # <-- Credential template
├── .gitignore                  # <-- Ignores your secret keys
└── README.md
```

---

## 🚨 Troubleshooting: Fixing "row level security" Errors

If you encounter a "new row violates row level security policy" error when generating a QR code, it means the security rules for file storage need to be updated.

Please run the following SQL script in your Supabase **SQL Editor** to fix this. This script is safe to run multiple times.

```sql
-- This script fixes the security rules for Supabase Storage.

-- Drop policies if they already exist to prevent errors
DROP POLICY IF EXISTS "Allow authenticated uploads to vcf-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from vcf-files" ON storage.objects;

-- Create policy to allow logged-in users to UPLOAD contact files
CREATE POLICY "Allow authenticated uploads to vcf-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'vcf-files' );

-- Create policy to allow ANYONE to DOWNLOAD the contact file via the QR code
CREATE POLICY "Allow public reads from vcf-files"
ON storage.objects FOR SELECT
USING ( bucket_id = 'vcf-files' );
```