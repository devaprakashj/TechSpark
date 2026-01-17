# 📚 TechSpark Club - Complete Documentation

> **Version:** 2.0  
> **Last Updated:** January 17, 2026  
> **Website:** https://techspark.club  
> **Organization:** TechSpark Club - RIT (Ramco Institute of Technology)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [User Roles](#user-roles)
4. [Features Summary](#features-summary)
5. [Student Workflow](#student-workflow)
6. [Organizer Workflow](#organizer-workflow)
7. [Admin Workflow](#admin-workflow)
8. [Event Types](#event-types)
9. [Quiz Proctoring System](#quiz-proctoring-system)
10. [Certificate System](#certificate-system)
11. [PDF Reports](#pdf-reports)
12. [QR Code System](#qr-code-system)
13. [Firebase Database Structure](#firebase-database-structure)
14. [API Integrations](#api-integrations)
15. [Deployment Guide](#deployment-guide)
16. [Troubleshooting](#troubleshooting)

---

## 🌟 Overview

**TechSpark** is a comprehensive event management and student engagement platform designed for RIT's premier technical club. The platform enables:

- 🎯 Event creation and management (Hackathons, Workshops, Quizzes, Seminars)
- 👥 Student registration and attendance tracking
- 🏆 Certificate generation and verification
- 📊 Real-time analytics and reporting
- 🔐 Multi-role access control (Admin, Organizer, Student)

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React.js 19, Vite 7 |
| **Styling** | TailwindCSS 3.4 |
| **Animations** | Framer Motion |
| **Database** | Firebase Firestore |
| **Authentication** | Custom JWT-like tokens in localStorage |
| **PDF Generation** | jsPDF + jspdf-autotable |
| **QR Code** | qrcode.react, @yudiel/react-qr-scanner |
| **Email** | EmailJS |
| **Hosting** | Vercel |
| **Certificate API** | Google Apps Script + Google Sheets |

---

## 👤 User Roles

### 1. **Student**
- Register for events
- View registered events
- Attend quizzes (with proctoring)
- View and download certificates
- Share certificates on LinkedIn
- View XP points and badges

### 2. **Organizer**
- Create and manage events
- View registrations
- Mark attendance
- Generate PDF reports
- View feedback
- Close/complete events

### 3. **Admin**
- Full control over all events
- Approve/reject event proposals
- Manage organizers
- View system analytics
- Delete events and users
- Revert completed events to LIVE
- Configure quiz settings

---

## ✨ Features Summary

| Feature | Student | Organizer | Admin |
|---------|---------|-----------|-------|
| View Events | ✅ | ✅ | ✅ |
| Register for Events | ✅ | ❌ | ❌ |
| Create Events | ❌ | ✅ | ✅ |
| Mark Attendance | ❌ | ✅ | ✅ |
| Generate Reports | ❌ | ✅ | ✅ |
| View Certificates | ✅ | ❌ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| System Settings | ❌ | ❌ | ✅ |

---

## 📱 Student Workflow

### Registration Process

1. **Access Website:** Visit `https://techspark.club`
2. **Login/Signup:** Use college roll number
3. **Browse Events:** See all LIVE events on dashboard
4. **Register:**
   - Solo events: Click "Register Now"
   - Team events: Enter team name, code, and role
5. **Confirmation:** See "REGISTERED" badge on event

### Attending Quiz Events

1. **Navigate to registered quiz**
2. **Click "Start Quiz"**
3. **Read Rules Modal:**
   - No tab switching (3 violations = termination)
   - No copy/paste
   - Complete in allotted time
4. **Accept & Start**
5. **Complete quiz in embedded iframe**
6. **Click "Finish Quiz"**

### Viewing Certificates

1. **Go to Dashboard → Certificate Vault**
2. **View all earned certificates**
3. **Each certificate shows:**
   - Event Name
   - Event Type (Hackathon/Workshop/Quiz)
   - Role (Winner 1st/2nd/3rd, Participant)
   - Event Date
   - Certificate ID
4. **Download:** Click download button
5. **Share on LinkedIn:** Click LinkedIn button
   - Alert shows: "Type @TechSpark to tag our page!"
   - Pre-filled post with all details

### Digital ID Card

- QR Code with roll number
- Download as image
- Use for check-in at events

---

## 🎪 Organizer Workflow

### Creating an Event

1. **Login:** `techspark.club/organizer/login`
2. **Dashboard → Create New Event**
3. **Fill Details (Step-by-Step):**

   **Step 1: Basic Info**
   - Title, Description
   - Event Type (Hackathon/Workshop/Quiz/Seminar/Competition)
   - Date, Time, Venue
   
   **Step 2: Capacity**
   - Max Participants
   - Team Event? (Yes/No)
   - If Team: Max team size
   
   **Step 3: Requirements**
   - Skills required
   - Prerequisites
   - Problem Statements (for Hackathons)
   
   **Step 4: Review & Submit**

4. **Wait for Admin Approval**
5. **Once approved → Event goes LIVE**

### Managing Registrations

1. **Select event from dashboard**
2. **View all registrations**
3. **Filter by:**
   - Department
   - Year
   - Flagged only (for quizzes)
4. **Search by name/roll number**

### Marking Attendance

**Option 1: QR Scanner**
- Click "QR Check-In"
- Scan student's ID card QR
- Auto-marks as "Present"

**Option 2: Manual**
- Find student in list
- Click "Check In" button

### Handling Quiz Violations

| Violations | Status | Action |
|------------|--------|--------|
| 0 | Clean | ✅ Present |
| 1-2 | Warning | ✅ Present (1 FLAG) |
| 3+ | Terminated | 🚫 MALPRACTICE |

**Remove Flag:**
- Click "Remove Flag" button
- Gives student another chance

### Generating Reports

1. **Select event**
2. **Click "Export"**
3. **Choose type:**
   - **Registration Report:** All registrations
   - **Attendance Report:** Only present + malpractice stats
4. **Select fields to include:**
   - Name, Roll, Dept, Year, Section
   - Phone, Squad, Role, Problem Statement
   - Date, Status
5. **Download PDF**

### Event Lifecycle

```
DRAFT → PENDING → LIVE → COMPLETED
                    ↓
              (Admin can revert)
                    ↓
                  LIVE
```

**Close Registration:**
- Click "Close Reg" button
- Students see "Registration Closed"

**Mark Complete:**
- Click "Mark Complete"
- Event moves to COMPLETED status

---

## 🔧 Admin Workflow

### Dashboard Overview

- Total Members
- Active Events
- Total XP distributed
- Total Badges earned

### Managing Events

**All Events Tab:**
- Filter by status (LIVE/PENDING/COMPLETED)
- Search events
- View registrations count
- Actions available:
  - Quiz Settings (for Quiz events)
  - **Back to LIVE** (for COMPLETED events)

### Approving Events

1. **View pending events**
2. **Click event to see details**
3. **Approve or Reject**
4. **If approved → Organizer can make it LIVE**

### Managing Organizers

**Create New Organizer:**
1. Click "Commission New Lead"
2. Enter details:
   - Full Name
   - Username
   - Password
   - Email, Phone
   - Department
   - Role
3. Share credentials with organizer

### Quiz Settings

**Configure Google Form Integration:**
1. Select Quiz event
2. Click "Settings"
3. Enter:
   - Google Form URL (prefilled link)
   - Entry field IDs:
     - `entry.xxx` for Name
     - `entry.xxx` for Roll
     - `entry.xxx` for Dept, Year, Section, Mobile
4. Save

### System Reports

**Download Options:**
- Impact Study Report
- Demographic Report
- Operational Audit Report

---

## 🎯 Event Types

### 1. Hackathon
- Team-based event
- Problem statement selection
- Multi-day duration
- Team registration with roles (Leader, Member)

### 2. Workshop
- Learning-focused
- Individual or team
- Certificate for all participants

### 3. Quiz
- **Proctored online quiz**
- Embedded Google Form
- Tab switch detection
- Auto-termination on violations
- Flagging system

### 4. Competition
- Competitive event
- Winners get special certificates
- Leaderboard

### 5. Seminar
- Guest speaker events
- Attendance tracking
- Feedback collection

---

## 🔒 Quiz Proctoring System

### How It Works

```javascript
// Proctoring Violations
MAX_VIOLATIONS = 3

// On tab switch detection:
if (document.hidden && showQuizModal) {
    violationCount++
    if (violationCount >= 3) {
        status = 'FLAGGED'
        // Quiz terminated
    }
}
```

### Student Experience

1. **Rules Modal** appears before quiz
2. **Warnings shown** on violations
3. **Quiz terminated** at 3rd violation
4. **Alert:** "Your quiz has been terminated"

### Organizer View

- 🚩 **FLAGGED** badge on student
- Flag count shown: `(1)`, `(2)`, `(3+)`
- "Remove Flag" option available

### PDF Report Status

| Violations | PDF Status |
|------------|------------|
| 3+ | MALPRACTICE |
| 1-2 (Present) | PRESENT (1 FLAG) |
| 0 (Present) | PRESENT |
| Not attended | ABSENT |

---

## 🏆 Certificate System

### Architecture

```
Firebase (Event Data) → Admin Downloads Report
                              ↓
                    Admin adds to Google Sheet
                              ↓
              Google Apps Script API serves data
                              ↓
           Student Dashboard / Verification Page
```

### Google Sheet Structure

| Column | Field | Example |
|--------|-------|---------|
| A | rollNumber | 21CSEB01 |
| B | studentName | Devaprakash J |
| C | eventName | Quantum Hackathon 2024 |
| D | eventType | Hackathon / Workshop / Quiz |
| E | eventDate | 2024-01-15 |
| F | role | WINNER_1ST / WINNER_2ND / WINNER_3RD / SPECIAL_MENTION / PARTICIPANT |
| G | certificateId | TSCERT-2024-001 |
| H | certificateUrl | Google Drive link |
| I | issuedAt | 2024-01-20 |

### Apps Script API

**Endpoint:**
```
https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec
```

**Query Parameters:**
- `?query=21CSEB01` - Search by roll number
- `?query=TSCERT-2024-001` - Search by certificate ID

**Response:**
```json
[
  {
    "rollNumber": "21CSEB01",
    "studentName": "Devaprakash J",
    "eventName": "Quantum Hackathon 2024",
    "eventType": "Hackathon",
    "eventDate": "2024-01-15",
    "role": "WINNER_1ST",
    "certificateId": "TSCERT-2024-001",
    "certificateUrl": "https://drive.google.com/...",
    "issuedAt": "2024-01-20"
  }
]
```

### Certificate Display

**Role Badges:**
- 🥇 **1st Place** - Gold gradient
- 🥈 **2nd Place** - Silver gradient
- 🥉 **3rd Place** - Bronze gradient
- ⭐ **Special Mention** - Purple gradient
- 🎖️ **Participant** - Grey badge

**Event Type Icons:**
- 🔮 Hackathon (Purple)
- 🛠️ Workshop (Blue)
- 📝 Quiz (Green)
- 🏆 Competition (Pink)
- 🎤 Seminar (Amber)

### LinkedIn Share

**Pre-filled Post:**
```
🎉 Excited to announce that I have successfully completed the "Event Name"!

📌 Event Type: Hackathon
📅 Date: 2024-01-15
🏅 Achievement: 🏆 1st Place
🆔 Certificate ID: TSCERT-2024-001

This hackathon was organized by @TechSpark Club - RIT, RIT's Premier Technical Club.

✅ Verify my certificate:
https://techspark.club/certificateverify?query=TSCERT-2024-001

Thank you @TechSpark Club - RIT for this amazing opportunity! 🙏

#TechSpark #RIT #Hackathon #Certificate #Achievement
```

### Public Verification

**URL:** `https://techspark.club/certificateverify?query=CERTIFICATE_ID`

Anyone can verify a certificate by:
1. Entering certificate ID or roll number
2. System fetches from Google Sheet API
3. Displays verified certificate with confetti animation

---

## 📄 PDF Reports

### Report Types

#### 1. Registration Report
- All registered participants
- Team information
- Problem statements (Hackathon)

#### 2. Attendance Report
- Present participants only
- Malpractice count (Quiz)
- Minor violations count
- Attendance percentage

### Report Sections

1. **Header**
   - RIT Logo + TechSpark Logo
   - Event Title
   - Report ID

2. **Summary Metrics**
   - Total Registrations
   - Attendance Rate
   - Department breakdown
   - Year breakdown

3. **Participant Table**
   - Customizable columns
   - Status column with flag count

4. **Footer**
   - Generated timestamp
   - Page numbers

---

## 📱 QR Code System

### Student ID Card QR

**Contains:** Roll Number
**Format:** Plain text (e.g., "21CSEB01")

### College ID QR Support

The system also supports scanning official college ID QRs:
- Detects URL pattern (ims.ritchennai.edu.in)
- Fetches verification page
- Extracts roll number
- Marks attendance

### Check-In Flow

```
Scan QR → Extract Roll Number → Find in Firestore
                                      ↓
                              Update registration:
                              - isAttended: true
                              - status: 'Present'
                              - checkInTime: timestamp
```

---

## 🗄️ Firebase Database Structure

### Collections

```
/users
  └── {userId}
      ├── fullName
      ├── rollNumber
      ├── email
      ├── department
      ├── yearOfStudy
      ├── section
      ├── admissionYear
      ├── phone
      ├── points (XP)
      ├── badges[]
      └── createdAt

/events
  └── {eventId}
      ├── title
      ├── description
      ├── type (Hackathon/Workshop/Quiz...)
      ├── date
      ├── time
      ├── venue
      ├── maxParticipants
      ├── isTeamEvent
      ├── maxTeamSize
      ├── status (DRAFT/PENDING/LIVE/COMPLETED)
      ├── registrationOpen
      ├── createdBy
      ├── problemStatements[]
      ├── quizFormUrl (for Quiz)
      ├── quizEntry* (form field IDs)
      └── createdAt

/registrations
  └── {regId}
      ├── eventId
      ├── studentId
      ├── studentName
      ├── studentRoll
      ├── studentDept
      ├── studentYear
      ├── studentSection
      ├── studentPhone
      ├── isTeamRegistration
      ├── teamName
      ├── teamCode
      ├── teamRole
      ├── problemStatement
      ├── isAttended
      ├── status
      ├── checkInTime
      ├── proctorViolations
      ├── feedbackSubmitted
      └── registeredAt

/organizers
  └── {orgId}
      ├── fullName
      ├── username
      ├── password (plain)
      ├── email
      ├── phone
      ├── department
      ├── role
      ├── status
      └── createdAt

/feedback
  └── {feedbackId}
      ├── eventId
      ├── registrationId
      ├── studentRoll
      ├── rating
      ├── review
      └── submittedAt

/quizSubmissions
  └── {subId}
      ├── eventId
      ├── studentRoll
      ├── studentName
      └── timestamp

/security_logs
  └── {logId}
      ├── action
      ├── userId
      ├── details
      └── timestamp
```

---

## 🔌 API Integrations

### 1. Google Apps Script (Certificates)

**Current URL:**
```
https://script.google.com/macros/s/AKfycbxZvWwaHjkFrS_yK3akleByW1FtmnWu7ht-UYt6ztPbTTnWUuGUmhjZ_HsOWdu5aHruFw/exec
```

### 2. EmailJS (Notifications)

**Service:** emailjs.com
**Used For:** Welcome emails, notifications

### 3. Firebase

**Project:** techspark-rit
**Services:** Firestore, Hosting (if used)

---

## 🚀 Deployment Guide

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Local Development

```bash
# Clone repository
git clone https://github.com/devaprakashj/TechSpark.git
cd TechSpark

# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

### Vercel Deployment

1. Connect GitHub repository to Vercel
2. Auto-deploys on push to main branch
3. **Note:** `.npmrc` file contains `legacy-peer-deps=true` for React 19 compatibility

### Environment Variables

No environment variables required - all config is in code.

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Certificate API Not Working
**Cause:** Old API URL in localStorage
**Fix:** Clear localStorage or use fresh browser

#### 2. Quiz Not Loading
**Cause:** Missing quiz form URL in event settings
**Fix:** Admin → Events → Quiz Settings → Enter Google Form URL

#### 3. Vercel Build Fails
**Cause:** Dependency conflict
**Fix:** Ensure `.npmrc` has `legacy-peer-deps=true`

#### 4. LinkedIn Share Missing Data
**Cause:** Google Sheet missing required columns
**Fix:** Ensure all 9 columns are present in sheet

#### 5. QR Scanner Not Working
**Cause:** Camera permissions denied
**Fix:** Allow camera access in browser settings

---

## 📞 Support

**TechSpark Club - RIT**
- Website: https://techspark.club
- LinkedIn: linkedin.com/company/techspark-rit
- Email: techspark@ritchennai.edu.in

---

## 📝 Changelog

### v2.0 (January 2026)
- ✅ Certificate System with Google Sheets
- ✅ LinkedIn Share with @mention
- ✅ Quiz Proctoring (Tab Switch Detection)
- ✅ Flagged Student Management
- ✅ PDF Reports with Malpractice Tracking
- ✅ Admin: Back to LIVE for completed events
- ✅ Event Type & Role Badges
- ✅ Public Certificate Verification

### v1.0 (November 2025)
- Initial Release
- Student Registration
- Event Management
- Basic Attendance Tracking
- QR Code Check-in

---

**© 2026 TechSpark Club - RIT. All Rights Reserved.**
