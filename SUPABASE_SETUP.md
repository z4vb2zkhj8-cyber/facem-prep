# FACEM Prep — secure reviewer setup

**This package does not become secure or functional until Supabase is configured.** The existing trainee app works without it.

1. Create a Supabase project under an account you control. Enable Auth → Email OTP. Configure the email template to display `{{ .Token }}` (6-digit code) instead of a magic link; configure an SMTP sender suitable for real users. Set site URL to `https://facem-prep.vercel.app`.
2. In the Supabase SQL editor, run `supabase-setup.sql`.
3. In `facem-config.js`, enter the Supabase **Project URL** and **public anon/publishable key**. Never put a `service_role` key in the browser or repository.
4. Upload the entire package to the GitHub repository root and deploy through Vercel.
5. Visit `/review-login.html` and sign in once with **your own** email code. The initial login will say not invited (expected).
6. In Supabase SQL editor, run the **bootstrap admin** SQL at the bottom of `supabase-setup.sql`, replacing `admin@example.com` with the exact email you just used. Sign in again.
7. As admin, invite FACEM email addresses using the dashboard. Reviewers use `/review-login.html`, enter their email and code, and can submit proposed changes. Only admin can approve/reject. Approved changes go to `facem_published`, loaded by trainees on subsequent app loads.

**Security model:** Supabase Auth signs users in; Postgres RLS blocks unauthorised table writes; all edits, invitations and approvals use server-side SECURITY DEFINER RPCs that check authenticated identity and membership. Trainees cannot access reviewer proposals. The question bank itself remains public, as intended. Reviewers do not directly change published questions.

**Important:** Admin bootstrapping requires you to run SQL in your own Supabase account. Email verification codes depend on SMTP and the correct email template. A production security review, monitoring, backups and rate limiting are recommended before widespread use. If Supabase is unavailable, the app falls back to bundled questions.

**Clinical safety:** Historical answer keys are unverified. Approval of edits is an editorial decision and does not imply independent guideline verification.
