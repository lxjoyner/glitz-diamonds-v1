# Phase 3: Help Video Manager (MP4 recordings)

## Hostinger setup

The Help Center stores MP4 files on persistent disk, **not** in GitHub, the Next.js public directory, or the database. The database stores only video metadata.

1. Create a private directory writable by the running Node.js application, for example:

   ```bash
   mkdir -p /home/u873010680/domains/glitzofdiamonds.com/private/help-videos
   chmod 700 /home/u873010680/domains/glitzofdiamonds.com/private/help-videos
   ```

   Adjust the path to match the actual app's Hostinger account and ensure the app process has permission to read/write it. The directory must persist across deployments. Do **not** locate it under `public_html`, `public/`, or the deployed public web root.

2. Add this server-side environment variable in **Hostinger Node application environment settings** (and optionally in local `.env.local`, with a separate development path):

   ```text
   HELP_VIDEO_STORAGE_DIR=/home/u873010680/domains/glitzofdiamonds.com/private/help-videos
   ```

3. Redeploy after merging and verify the application has MySQL `CREATE TABLE` permission to initialize the `help_videos` table. If the runtime database user cannot create tables, create the table manually using the SQL schema in `lib/help-video-db.ts`, then restart the app.
4. Back up this private directory **and** the MySQL table as part of production backups; they must be restored together.

## Using the manager

- Admin signs in and opens **Help Center → Manage Help Videos**.
- Record a short MP4 with Windows Snipping Tool (under 30MB).
- Select the Help topic (roles automatically inherit the topic's existing access rules).
- Add a title and optional description, then upload.
- Use **Hide/Publish** to control visibility, **Edit details** to edit the title/description, or **Delete** to remove a recording permanently.
- Signed-in users see videos only for topics in their role-specific Help catalog; playback supports browser byte-range requests.

## Constraints and security

- Videos must be MP4 with an MP4 `ftyp` header and be no larger than 30 MiB.
- File upload and management are admin-only; playback requires authentication, Help enabled, published status, and topic role authorization.
- Files are stored under randomly generated names in an explicitly configured private, absolute directory. Avoid symlinks or world-readable permissions on that directory.
- The `/api/help/videos/[id]` endpoint does not allow anonymous access, and supports partial-content requests for playback.
- The tutorial topic list is curated in `lib/help-catalog.ts`; Phase 3 does not introduce new topic creation or custom per-role overrides.
- Test on staging before production. Confirm Hostinger upload limits/proxies permit 30MB uploads. For larger recordings, compress/export them to smaller MP4 files.
- Do not record real user passwords, financial details or personal data.

## Functional verification

1. Run `npm run build` and confirm TypeScript passes.
2. With Help enabled, upload a short valid MP4 as admin; ensure it appears on the correct topic and can play and seek.
3. Log in as a treasurer, secretary and member; check only appropriate role topics and recordings display.
4. Directly visit `/api/help/videos/<id>` when logged out, Help disabled, or using a role not allowed for the topic; access must be rejected.
5. Test 30MB+ and non-MP4 upload rejection, invalid topic, missing file, and non-admin upload attempts.
6. Hide a video, verify playback and catalog access are denied; re-publish, then test again.
7. Delete a test video and verify its file and metadata disappear.
8. Restart/redeploy staging and verify the uploaded recording persists.
