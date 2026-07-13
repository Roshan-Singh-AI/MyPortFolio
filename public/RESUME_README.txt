DROP YOUR RESUME PDF HERE
=========================

The /resume page on the site serves the file:

    public/Roshan_Singh_Resume.pdf

To update your resume on the live site (no code, no CMS):

  1. Export your resume to PDF (from Overleaf: Download -> PDF).
  2. Rename it EXACTLY:  Roshan_Singh_Resume.pdf
  3. Put it in this  public/  folder (replace the old one).
  4. git add + commit + push   (or drag-drop it on github.com).
  5. Vercel auto-redeploys in ~1 minute. The /resume page now serves the
     new PDF, and the View / Download buttons point at it automatically.

To change the "Updated <month>" label shown on the page, edit
`site.resume.updated` in  src/content/site.ts .

If the file is missing, the /resume page still loads and shows a graceful
"open/download" fallback instead of a broken embed -- so a missing PDF never
breaks the site. But add the real PDF before you share the link.

(You can delete this note file once the PDF is in place.)
