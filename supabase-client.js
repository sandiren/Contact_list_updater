const { createClient } = supabase;

// Supabase credentials provided by the user
const supabaseUrl = 'https://ofxtkzognzqfricoxdvy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9meHRrem9nbnpxZnJpY294ZHZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzQwNTYsImV4cCI6MjA3NDU1MDA1Nn0.XBOMqotiWXvpmH5RACmim7709vUsxIoar2BDs1W1mYA';

// Initialize the Supabase client
const _supabase = createClient(supabaseUrl, supabaseKey);

console.log('Supabase client initialized.');