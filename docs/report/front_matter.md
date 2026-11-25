# FRONT MATTER — B.Tech. CSE Summer Internship Report

---

## TITLE PAGE (Page i)

**Samadhan v2: A Bilingual Web Application for Civic Issue Reporting and Local Helper Discovery**

*A Report*  
*Submitted in partial fulfilment of the requirements for the award of the Degree of*  
**Bachelor of Technology**  
*in*  
**Computer Science and Engineering**  
*By*  

Demo Student A (`DEMO/001/26`, CSE)  
Demo Student B (`DEMO/002/26`, CSE)  

*(Demo Institute Circular Emblem embedded)*

**Demo Engineering Institute**  
**Demo Campus, India**

---

## APPROVAL OF THE GUIDE (Page ii)

Recommended that the B. Tech. Summer Internship Project titled **Samadhan v2: A Bilingual Web Application for Civic Issue Reporting and Local Helper Discovery** submitted by **Demo Student A (DEMO/001/26)** and **Demo Student B (DEMO/002/26)** is approved by me for submission. This should be accepted as fulfilling the partial requirements for the award of Degree of Bachelor of Technology in **Computer Science and Engineering**. To the best of my knowledge, the report represents work carried out by the students in the Department of Computer Science and Engineering, Demo Engineering Institute, Demo City, and the content of this report has not formed a basis for the award of any previous degree to anyone else.

**Date:** 26 November 2026  
**Faculty Guide**  
Assistant Professor  
Department of Computer Science and Engineering  
Demo Engineering Institute  

---

## DECLARATION CERTIFICATE (Page iii)

We certify that:

a) The work contained in the report is original and has been done by us under the general supervision of our supervisor.  
b) The work has not been submitted to any other Institute for any other degree or diploma.  
c) We have followed the guidelines provided by the Institute in writing the report.  
d) We have conformed to the norms and guidelines given in the Ethical Code of Conduct of the Institute.  
e) Whenever we have used materials (data, theoretical analysis, and text) from other sources, we have given due credit to them by citing them in the text of the report and giving their details in the references.  
f) Whenever we have quoted written materials from other sources, we have put them under quotation marks and given due credit to the sources by citing them and giving required details in the references.  

**Date:** 26 November 2026  

Demo Student A (`DEMO/001/26`)  
Demo Student B (`DEMO/002/26`)  
Department of Computer Science and Engineering  
Demo Engineering Institute  

---

## CERTIFICATE OF APPROVAL (Page iv)

This is to certify that the work embodied in this Summer Internship Report entitled  
“**Samadhan v2: A Bilingual Web Application for Civic Issue Reporting and Local Helper Discovery**”,  
is carried out by **Demo Student A (DEMO/001/26)** and **Demo Student B (DEMO/002/26)** and has been approved for the degree of Bachelor of Technology in **Computer Science and Engineering** of Demo Engineering Institute, Demo City.

**Date:** 26 November 2026  
**Place:** Demo City  

**(Chairman)** — Head of the Department, Dept. of Comp. Sc. & Engg.  
**(Panel Coordinator)** — Examiner, Dept. of Comp. Sc. & Engg.  

---

## ABSTRACT (Page v)

Urban neighbourhoods run into two common problems. Street faults like potholes, dark streetlights, or garbage piles drag on because residents submit scattered solo complaints. Meanwhile, searching for a nearby plumber or electrician often leaves a worker's phone number open to spam and unverified ratings.

We built Samadhan v2 to solve both inside one English and Hindi web app. The frontend uses React, and the backend uses Node.js, Express, and MongoDB. In Global Mode, users pay a simulated 5-rupee fee (500 paise) to report a civic issue. Before charging, the server checks for an active complaint of the same type within 100 meters over the past 30 days. When one matches, the app suggests paying 1 rupee (100 paise) to support that post and avoid a duplicate. Wallet updates and issue saves execute inside one database transaction so balances never drop below zero. Crossing 200 rupees or 500 rupees unlocks shareable post templates and an official department email log. In Local Mode, residents search verified helpers across nine trades for free. Street addresses and phone numbers stay hidden until a Connect tap, capped at 10 per 24 hours.

Across automated checks, all 18 frontend tests, 817 bilingual keys, and 141 out of 142 backend tests passed. Because fees and emails are simulated, live payment gateways and load tests remain future work.

---

## ACKNOWLEDGEMENT (Page vi)

We thank our project guide, **Faculty Guide**, Assistant Professor in the Department of Computer Science and Engineering at Demo Engineering Institute. His feedback helped us simplify our database schema, fix payment race bugs during testing, and state prototype limits honestly.

We are also grateful to the Head of the Department, CSE teachers, and lab staff for lab access and timely guidance. Classmates who checked our English and Hindi pages on mobile phones helped catch layout issues early.

Finally, we thank our parents and families for their patience and steady support while we wrote the code and this report.

**Date:** 26 November 2026  

**(Signatures)**  
Demo Student A (`DEMO/001/26`)  
Demo Student B (`DEMO/002/26`)  

---

## CONTENTS, LIST OF FIGURES & LIST OF TABLES (Pages vii–ix)

*(Populated automatically via Word fields during build.)*
