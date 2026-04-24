---                                                                                                                  
  OSW Permits Admin — Setup Guide
                                                                                                                                 
  Prerequisites                                                                                                                  
                                                                                                                                 
  - Node.js 18+ installed                                                                                                        
  - A Supabase account (free tier works)                                                                                         
                                                                                                                                 
  ---
  Step 1 — Create a Supabase Project                                                                                             
                                                            
  1. Go to supabase.com and sign in
  2. Click New project                                                                                                           
  3. Choose an organization, name the project (e.g. osw-permits), set a strong database password, pick a region close to you
  4. Wait ~2 minutes for provisioning to complete                                                                                
                                                            
  ---                                                                                                                            
  Step 2 — Run the Database Migrations                      
                                                                                                                                 
  The schema lives in two SQL files. You need to run them in order.
                                                                                                                                 
  1. In your Supabase dashboard, go to SQL Editor (left sidebar)
  2. Click New query                                                                                                             
  3. Open frontend/supabase/migrations/0001_init_admin_schema.sql from this repo, paste the entire contents, and click Run
  4. Open a second new query, paste frontend/supabase/migrations/0002_seed_states.sql, and click Run                             
                                                                                                                                 
  This creates all 8 tables, enums, triggers, RLS policies, and seeds the 51 US states.                                          
                                                                                                                                 
  ---                                                                                                                            
  Step 3 — Create a Storage Bucket                          
                                  
  Permit documents are stored in Supabase Storage.
                                                                                                                                 
  1. Go to Storage in the Supabase sidebar
  2. Click New bucket                                                                                                            
  3. Name it exactly: permit-documents                                                                                           
  4. Set Public to OFF (private bucket — signed URLs are used)
  5. Click Save                                                                                                                  
                                                            
  ---                                                                                                                            
  Step 4 — Get Your API Keys                                
                            
  1. Go to Project Settings → API in the Supabase sidebar
  2. Copy these three values:                                                                                                    
    - Project URL (e.g. https://xxxxxxxxxxxx.supabase.co)                                                                        
    - anon / public key                                                                                                          
    - service_role key (click the eye icon to reveal — keep this secret)                                                         
                                                                                                                                 
  ---
  Step 5 — Configure Environment Variables                                                                                       
                                                                                                                                 
  In the frontend/ directory, create a .env.local file:
                                                                                                                                 
  cp frontend/.env.local.example frontend/.env.local        
                                                                                                                                 
  Open frontend/.env.local and fill in:
                                                                                                                                 
  # From Supabase Project Settings → API                    
  NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...                                                                                      
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
                                                                                                                                 
  # Generate a 32-byte AES key for encrypting state portal passwords                                                             
  # Run this command and paste the output:                                                                                       
  # node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"                                                  
  CREDENTIALS_ENCRYPTION_KEY=<your-generated-key>                                                                                
   
  # Optional — only needed for the landing page contact form                                                                     
  SMTP_HOST=smtp.gmail.com                                  
  SMTP_PORT=587                                                                                                                  
  SMTP_USER=your@email.com                                  
  SMTP_PASS=your-app-password                                                                                                    
  RECIPIENT_EMAIL=recipient@email.com
                                                                                                                                 
  To generate the encryption key, run this once in your terminal:                                                                
   
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"                                                    
                                                            
  ---
  Step 6 — Install Dependencies and Run
                                                                                                                                 
  cd frontend
  npm install                                                                                                                    
  npm run dev                                               

  The app will be available at http://localhost:3000.

  ---
  Step 7 — Create Your Admin User
                                                                                                                                 
  7a. Create the auth user
                                                                                                                                 
  1. Go to Authentication → Users in Supabase                                                                                    
  2. Click Add user → Create new user
  3. Enter your email and a strong password                                                                                      
  4. Click Create user                                      
  5. Copy the User UID shown (it looks like xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)                                                
                                                                                                                                 
  7b. Grant admin access                                                                                                         
                                                                                                                                 
  The app uses an admins allowlist table. Any authenticated user NOT in this table is blocked from the admin panel.              
   
  1. Go to SQL Editor and run:                                                                                                   
                                                            
  INSERT INTO public.admins (user_id, role)
  VALUES ('<paste-your-user-uid-here>', 'admin');
                                                                                                                                 
  Replace <paste-your-user-uid-here> with the UID you copied.                                                                    
                                                                                                                                 
  ---                                                                                                                            
  Step 8 — Log In                                           

  1. Go to http://localhost:3000/login
  2. Enter the email and password you created in Step 7a
  3. You'll be redirected to /admin/dashboard                                                                                    
   
  If you see a redirect back to / after login, it means your user ID is not in the admins table — go back to Step 7b and verify  
  the UUID matches exactly.                                 
                                                                                                                                 
  ---                                                       
  How Authentication Works
                          
  The security model has three layers:
                                                                                                                                 
  ┌────────────────────┬────────────────────────────────────────────────────────────────────────────────────┐
  │       Layer        │                                    What it does                                    │                    
  ├────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ Middleware         │ Checks Supabase session on every /admin/* request. No session → redirect to /login │
  ├────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ Admins table check │ Even with a valid session, if user_id is not in public.admins, redirect to /       │                    
  ├────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤                    
  │ Every API route    │ Each /api/admin/* endpoint re-verifies admin status server-side                    │                    
  └────────────────────┴────────────────────────────────────────────────────────────────────────────────────┘                    
                                                            
  This means: creating a Supabase auth user alone is not enough — you must insert a row into public.admins for that user.        
                                                            
  ---                                                                                                                            
  Quick Reference                                           

  ┌───────────────┬─────────────────────────────────────────┐
  │    Command    │              What it does               │
  ├───────────────┼─────────────────────────────────────────┤
  │ npm run dev   │ Start dev server at localhost:3000      │
  ├───────────────┼─────────────────────────────────────────┤
  │ npm run build │ Production build (also runs type-check) │
  ├───────────────┼─────────────────────────────────────────┤                                                                    
  │ npm run start │ Run the production build                │
  └───────────────┴─────────────────────────────────────────┘                                                                    
                                                            
  ┌───────────────────┬─────────────────────────┐                                                                                
  │        URL        │          Page           │           
  ├───────────────────┼─────────────────────────┤
  │ /                 │ Landing page (public)   │
  ├───────────────────┼─────────────────────────┤
  │ /login            │ Admin login             │                                                                                
  ├───────────────────┼─────────────────────────┤
  │ /admin/dashboard  │ Stats + orders overview │                                                                                
  ├───────────────────┼─────────────────────────┤                                                                                
  │ /admin/orders     │ All orders              │
  ├───────────────────┼─────────────────────────┤                                                                                
  │ /admin/orders/new │ New order wizard        │           
  ├───────────────────┼─────────────────────────┤
  │ /admin/customers  │ Customer list           │
  ├───────────────────┼─────────────────────────┤                                                                                
  │ /admin/invoices   │ Invoice list            │
  └───────────────────┴─────────────────────────┘                                     