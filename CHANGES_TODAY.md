# Today's Implementation Changelog

We have successfully designed, built, and tested several key features for **TechSpark**:

---

## 1. Inter-College Event Registration & Public Sign-up Bypass
- **Public Showcase & Warnings**: Marked inter-college events (like hackathons) to be visible to all users on the homepage. Clicking "Register Now" without active sessions prompts an warning block reminding RIT students to use Google Auth, while allowing external college students to proceed.
- **On-the-Fly Credentials**: External students can fill in their details (Name, College Name, Department, Year, Email, Password, Phone) to register an account and auto-enroll in the hackathon.
- **Domain Restriction Bypass**: Modified `AuthContext.jsx` to verify the `isExternalStudent === true` Firestore record so they are not rejected by the `@ritchennai.edu.in` rigid domain lock.
- **External Participant Hub**: Added a responsive wrapper in `App.jsx` that renders a restricted workspace showing their confirmed check-in QR code, profile, and registration details, while blocking internal student features.

---

## 2. 3D Flipping TechSpark ID Card
- **3D Flipping Animations**: Added custom hardware-accelerated CSS perspective utilities in `index.css` to build an interactive 3D flippable card inside the Student Dashboard.
- **Front Side**: Contains the member's profile avatar, Full Name, Roll/Reg Number, Department, and study year.
- **Back Side**: Displays their unique Campus Entry QR Code, DOB, and Admission details.
- **Profile Collection**: Added a mandatory DOB input date-picker popup modal on student login to verify the record before generating cards.
- **High-Quality Download**: Integrated `html-to-image` to support downloading the high-resolution ID card layout directly.

---

## 3. Class-to-Class Canvassing for PROs
- **Dynamic Task Assignment**: Added logic inside `StudentDashboard.jsx` to dynamically assign active "Class Canvassing" tasks to core team members with the **PRO** (Public Relations Officer) role for any newly created live events.
- **Environment Camera Capture**: Enabled a custom environmental camera capture interface directly inside the student portal.
- **5-Photo Verification**: PROs must snap exactly 5 photos inside different classrooms to verify event promotion. Capturing locks the photos in a filmstrip preview and uploads the base64 data URL list directly to Firestore on completion to clear the pending action.

---

## 4. Google Drive Reports Upload Routing
- **Folder Destination Mapping**: Mapped generated files to their respective target Google Drive folders:
  - **OD Letters**: `https://drive.google.com/drive/folders/182DJrpZInyAuAMekHmrlcAoXRtVKbVvd?usp=drive_link`
  - **Event Reports**: `https://drive.google.com/drive/folders/11QRJDz_lZi2yhYkUZHSOhp1G5JwR84R8?usp=drive_link`
  - **Approval Letters**: `https://drive.google.com/drive/folders/1mmqrgq5zoRuYsjwnuqumX-SMIKL8Yka9?usp=drive_link`
- **Prefix Suffixing**: Generated and locally downloaded PDF files with custom names and randomized suffix identification codes (e.g. `_TS-[ID].pdf`).
- **Upload Simulation & Link Trigger**: Initiated progress tracking (0% to 100%) and saved metadata logs to `ts_drive_uploads` in Firestore, before opening the designated Google Drive target folder in a new tab.
