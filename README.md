# 🚚 Faster Packing Lists

AI-powered 📸 packing list generation for bakery and dessert deliveries.

---

## 💡 Project idea

This project helps drivers create accurate packing lists faster and with less effort. Instead of manually writing down each item, the system uses a camera and AI image recognition to detect products in the crates and automatically add them to the order.

---

## ⚠️ Problem

Many drivers do not know how to create a correct packing list for every customer. This can lead to mistakes, missing items, delays, and poor communication between the kitchen and delivery staff.

---

## ✅ Solution

The goal is to make the process simple, fast, and automatic. Drivers can open the application, scan a QR code, take photos of the prepared crates, and let AI identify the cakes and desserts. The system then creates the packing list and counts the items automatically.

---

## 📚 Other documentation

### 🧭 Tutorials

- [📸 How to create photos](Documentation/Tutorials/How_to_create_photos.md)


### 🗺️ Navigation

- [🌐 Website](./Documentation/Navigation/Website.md)
    - 🔐 Login
    - 📷 How and where to add reference photos
    - 🧾 How to create a packing list

### 🏗️ Architecture

- [System Overview](./Documentation/Architecture/System_Overview.md)
- [Roles & Onboarding](./Documentation/Architecture/Roles_And_Onboarding.md)
- [Activity Log](./Documentation/Architecture/Activity_Log.md)
- [Data Flow](./Documentation/Architecture/Data_Flow.md)
- [Data Model](./Documentation/Architecture/Data_Model.md)
- [AI Recognition](./Documentation/Architecture/AI_Recognition.md)
- [SuperFaktúra Integration](./Documentation/Architecture/SuperFaktura_Integration.md)
- [Network & QR Session](./Documentation/Architecture/Network_Session.md)

### 🧪 Testing

- [AI Recognition Test Plan](./Documentation/Testing/Test_Plan.md)

---

## 🛠️ How it works

### 1. Preparation

- Cakes and desserts are prepared and stored in crates in a cooler.
- The driver opens the application on the PC and starts the process.

### 2. Adding items to the list

- The driver chooses between adding items manually or scanning a QR code.
- After scanning the QR code, a website opens with a connected camera.
- The driver takes photos of the crates.
- The AI analyzes each photo and identifies the visible cake or dessert.
- The recognized items are automatically added to the packing list and counted.

### 3. Final step

- After the items are confirmed, the driver clicks the `PDF` button.
- The system generates a final PDF packing list for the customer.

---

## 🌟 Why this is useful

- Saves time for drivers
- Reduces human mistakes
- Makes packing lists more accurate
- Speeds up delivery preparation
- Creates a cleaner and more professional process

---

## 🎯 Expected outcome

The final result is a fast and practical system that helps drivers prepare customer orders more efficiently while reducing mistakes and improving the quality of the delivery process.
