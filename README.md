# ClaimDataTracker — mobile-first web app

A free, installable web app for your tyre warranty claims. Built mobile-first
(that's where you'll use it most), works just as well on desktop.

**Everything below is free forever. No servers to run, no paid services.**

---

## First, the honest bit about the APK

I can't hand you a `.apk` file, and you don't need one. What you actually want
is an icon on your phone that opens the app fullscreen with live data — this
app does that. On Android you'll tap **Install app** in Chrome and it lands on
your home screen with its own icon, no browser bars, exactly like a normal app.

(If you later want a literal `.apk` for some reason — e.g. to hand a file to
someone — the free tool **pwabuilder.com** turns this app into a signed APK in
about two minutes once it's hosted. But try the installed version first; it's
almost certainly all you need.)

---

## What's in this folder

| File | What it's for |
|---|---|
| `index.html` | The entire app |
| `manifest.webmanifest` | Makes it installable on your phone |
| `sw.js` | Makes it open instantly and survive weak signal |
| `icon-*.png`, `apple-touch-icon.png` | Home screen icons |
| `Code.gs` | The backend — paste into your Google Sheet |
| `README.md` | This file |

---

## Try it right now

Open `index.html` and tap **Continue in demo mode**. Everything works with
sample data. Nothing is saved until you do the setup below.

---

## Setup — about 20 minutes, three parts

### Part 1 — Put it online (free, ~5 min)

You need it on the internet so your phone can reach it. **GitHub Pages** is the
simplest free option:

1. Make a free account at [github.com](https://github.com).
2. Click **+ → New repository**. Name it `claimtracker`. Set it **Public**
   (Pages needs this on free accounts — see the privacy note below). Create it.
3. On the repo page click **Add file → Upload files**, drag in *everything*
   from this folder, and click **Commit changes**.
4. Go to **Settings → Pages**. Under "Branch" pick `main` and `/ (root)`, then
   **Save**.
5. Wait a minute, refresh. You'll get a URL like
   `https://yourname.github.io/claimtracker/`. That's your app.

> **"Public repo — is my data exposed?"** No. The repo holds the app's
> *appearance and code*, not your claims. Every claim lives in your private
> Google Sheet, and Part 3 makes sure only your staff's accounts can read it.
> A stranger opening the URL sees a login screen and gets nothing past it.

### Part 2 — Connect your Google Sheet (free, ~5 min)

1. Open the Google Sheet your AppSheet app uses (or a copy).
2. Make sure there's a tab named exactly **Main**. (If it doesn't exist, the
   script creates it with the right headers on first run.) Columns, in order:
   `WC_ID, S No, ClaimDate, CustomerName, CustomerMobile, Company, TyreGroup, TyreItem, SerialNumber, ProblemDescription, DocketNumber, CompanySentDate, Result, ApprovedAmount, CustomerContribution, NewTyreReceivedDate, NewTyreGivenDate, CompanyReturnDate, ReturnedToCustomerDate, Remark`
3. **Extensions → Apps Script**. Delete the sample code, paste in all of `Code.gs`.
4. At the top of that file, edit `ALLOWED_EMAILS` — put in the exact Gmail
   address of every person who should have access.
5. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy, then **Authorize access** and approve.
6. Copy the URL it gives you (ends in `/exec`).

> **"Anyone?!"** It only means Google passes the request to your script. The
> script then checks the caller's verified Google identity against your
> `ALLOWED_EMAILS` list before it touches the sheet. That check runs on
> Google's servers, in a file only you can edit. Anyone else gets
> `unauthorised` and no data.

### Part 3 — Turn on Google Sign-In (free, ~10 min)

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a
   project (any name).
2. **APIs & Services → OAuth consent screen** → External → fill in app name and
   your email → Save. **Leave it in "Testing" — do not publish.**
3. On that same screen find **Test users → Add users**, and add the same staff
   emails from Part 2.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID →
   Web application**. Under *Authorised JavaScript origins* add your Pages
   origin — just the domain part, e.g. `https://yourname.github.io`.
5. Copy the **Client ID**.
6. Edit `index.html` (you can do this right on GitHub — click the file, then
   the pencil icon). Near the top of the `<script>` section fill in all three:

```js
const GOOGLE_CLIENT_ID = "…apps.googleusercontent.com";   // from step 5
const SCRIPT_URL       = "https://script.google.com/…/exec"; // from Part 2
const ALLOWED_EMAILS   = ["you@gmail.com", "manager@gmail.com"];
```

7. Also paste the **same Client ID** into `CLIENT_ID` at the top of `Code.gs`,
   and re-deploy (**Deploy → Manage deployments → edit → Version: New → Deploy**).

Done. Open your Pages URL, sign in, and you're live.

> First sign-in shows a **"Google hasn't verified this app"** notice. That's
> normal for a private internal tool that hasn't gone through Google's public
> review. Tap **Advanced → Go to ClaimDataTracker (unsafe)**. It's your own app;
> the wording is just Google being cautious about unreviewed apps in general.

---

## Install it on your phone

**Android / Chrome:** open the URL → menu (⋮) → **Install app** (or *Add to
Home screen*). It appears on your home screen and opens fullscreen.

**iPhone / Safari:** open the URL → Share → **Add to Home Screen**.

**Desktop:** Chrome/Edge show an install icon in the address bar.

---

## How it's built for the phone

- **Bottom tab bar** — Home, Claims, ➕ New, Open, More. Thumb-reachable.
- **Cards instead of tables** — claims show as tappable cards on phones; the
  full table appears on desktop.
- **Full-screen forms** with large fields (sized so iOS doesn't zoom on tap).
- **Safe-area aware** — nothing hides behind notches or gesture bars.
- **Offline notice** — a banner appears if you lose signal, so you never think
  something saved when it didn't.
- **Live data always** — the app shell is cached for speed, but claim data is
  *never* cached. What you see is what's in the sheet.

---

## Everyday use

- **New claim:** tap ➕. Pick the stage it's at — the form shows only the fields
  that stage needs. A claim that's already finished can be entered in one go.
- **Find a claim:** the search box on Home covers docket no., name, mobile,
  company, group, item and serial.
- **Stages move themselves** based on the dates you fill in:

| Stage | When |
|---|---|
| Claim Received | No "Company Sent Date" yet |
| Under Inspection | Sent, no Result yet |
| Rejected Pickup Pending | Result = Fail, not yet collected |
| New Tyre Pending | Result = Pass, tyre not yet collected |
| Pass Claims | Pass + given to customer |
| Rejected Claims | Fail + returned to customer |

---

## Changing things later

- **Add/remove staff:** edit `ALLOWED_EMAILS` in `Code.gs` **and** the Test
  users list in Cloud Console. (The list in `index.html` is only for a friendly
  early message — the one in `Code.gs` is what actually enforces it.)
- **Add stock items:** Stock Items tab in the app has a paste-in importer
  (Company, Group, Item, SearchKey — tab separated).
- **Update the app:** edit `index.html` on GitHub; the change is live in a
  minute. Bump `CACHE = "claimtracker-shell-v1"` in `sw.js` to `v2` to push the
  update to phones that already have it installed.

---

## If something doesn't work

| Problem | Likely cause |
|---|---|
| Stuck on "Demo mode" banner | `SCRIPT_URL` is empty or wrong in `index.html` |
| "Account isn't authorised" | Email missing from `ALLOWED_EMAILS` in `Code.gs`, or not in Test users |
| Sign-in button missing | `GOOGLE_CLIENT_ID` empty, or origin not added in Cloud Console |
| Data won't save | Re-deploy Apps Script as a **New version** after editing |
| No "Install app" option | Needs HTTPS — works on the Pages URL, not a local file |
