# EOS

Daily operations console for Engineer On Site (EOS) at PT Jala Lintas Media. The company sells on-site engineers to client companies. One codebase runs on Android, iOS (Expo Go), and the web.

## Operations desk

After sign-in, the desk tracks:

- Client companies and the report template each site uses
- EOS personnel and which contract they are assigned to
- Contract start and end dates
- Daily field reports, then weekly, monthly, and yearly coverage built from the locked daily reports

An admin maintains clients, personnel, contracts, and user accounts. An engineer files the daily report for a contract.

## What a daily report includes

- Sign in, then create, edit, lock, and reopen a daily report.
- Record shift time, location, activities, and field notes.
- Upload one or more MRTG or Cacti screenshots. The app reads the link name, date, time window, and traffic, then fills the matching slot. The image is not shown on screen. It is kept with that slot and printed in the PDF.
- Review download and upload current, average, and max. A value is flagged when the average is higher than the max.
- Save the report in the app. Sharing to a WhatsApp group is optional: a switch opens the share sheet so the engineer can pick the group.
- Generate a PDF that includes the traffic summary, including max, and the full traffic tables.

Accounts live on the device. An admin can create engineer and admin users from **Users**.

## Sign in

The built-in administrator username is `admin`.

The password is written to `secret/admin-password.txt` in the parent folder of this app, on the machine where the account was created. That file is not part of this repository. Do not commit passwords, exports of the local database, or MRTG screenshots.

## Run locally

Requires Node.js.

```bash
npm install
npx expo start
```

- Web dashboard: `npx expo start --web --host lan`, then open the localhost URL in a browser.
- Phone: open the project in Expo Go with the LAN address printed by Expo, not `127.0.0.1`.
- Android and iOS scripts: `npm run android` and `npm run ios`. An iOS store build still needs a Mac.

The first OCR run in the browser downloads English language data. Wait until the status line says it is reading the image.

## Data

Reports, clients, personnel, contracts, and users are stored on the device. The web build uses `localStorage`. Android and iOS use SQLite. Nothing is sent to a server. Deleting the sample report does not recreate it.

## Project layout

| Path | Role |
| --- | --- |
| `App.tsx` | Sign-in gate and screen switching |
| `src/screens` | Login, user management, report list, editor, and detail |
| `src/ocr.ts` | Turns graph text into link, window, date, and metrics |
| `src/pdf.ts` | HTML used to print the report |
| `scripts` | Local checks for the parser and the PDF |
