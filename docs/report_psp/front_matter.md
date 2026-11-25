# FRONT MATTER — B.Tech. CSE Summer Internship Report

---

## TITLE PAGE (Page i)

**Problem-Solving Platform: A Web Application for Local Services and Collective Public Issue Resolution**

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

Recommended that the B. Tech. Summer Internship Project titled “**Problem-Solving Platform: A Web Application for Local Services and Collective Public Issue Resolution**” submitted by **Demo Student A (DEMO/001/26)** and **Demo Student B (DEMO/002/26)** is approved by me for submission. This should be accepted as fulfilling the partial requirements for the award of Degree of Bachelor of Technology in **Computer Science and Engineering**. To the best of my knowledge, the report represents work carried out by the students in the Department of Computer Science and Engineering, Demo Engineering Institute, Demo City, and the content of this report does not form a basis for the award of any previous degree to anyone else.

**Date:** 26 November 2026  
**Faculty Guide**  
Assistant Professor  
Department of Computer Science and Engineering  
Demo Engineering Institute  

---

## DECLARATION CERTIFICATE (Page iii)

We certify that:

a) The work contained in the report is original and has been done by ourselves under the general supervision of our supervisor.  
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

This is to certify that the work embodied in this Summer Internship Report entitled “**Problem-Solving Platform: A Web Application for Local Services and Collective Public Issue Resolution**”, is carried out by **Demo Student A (DEMO/001/26)** and **Demo Student B (DEMO/002/26)** and has been approved for the degree of Bachelor of Technology in **Computer Science and Engineering** of Demo Engineering Institute, Demo City.

**Date:** 26 November 2026  
**Place:** Demo City  

**(Chairman)** — Head of the Department, Dept. of Comp. Sc. & Engg.  
**(Panel Coordinator)** — Examiner, Dept. of Comp. Sc. & Engg.  

---

## ABSTRACT (Page v)

People often struggle to find reliable local repair help quickly, and the same residents lack an easy way to group scattered street complaints into visible public cases. This project implements a single bilingual web application (Samadhan v2) with two connected modes in English and Hindi.

The first part is a free Local Services directory across nine household trades. Medical help is omitted so urgent needs go to India's 112 helpline. Helpers are approved by an admin and filtered by both user and helper distance limits. Public pages show only rounded coordinates, and phone numbers stay hidden until a logged-in user taps Connect (capped at 10 per 24 hours).

The second part is a Global Issue Network where citizens report civic problems for a simulated 5-rupee fee (500 paise) from a demo wallet. Before charging, the server checks for an active issue of the same type within 100 meters over the last 30 days. When one matches, the app suggests paying 1 rupee to support that ticket and avoid creating a duplicate. Wallet updates and issue saves run inside MongoDB transactions. Reaching 200 rupees or 500 rupees unlocks bilingual share templates and a department dispatch preview.

The application runs on React 18, Express 5, and MongoDB Atlas with 17 collections. Automated checks verified all 18 frontend tests, 817 English and Hindi keys, and 141 out of 142 backend integration tests. Real payment gateways and load benchmarks remain future work.

---

## ACKNOWLEDGEMENT (Page vi)

We thank our guide, **Faculty Guide**, Assistant Professor in the Department of Computer Science and Engineering at Demo Engineering Institute, for his patient guidance throughout this work. His feedback during our reviews helped us simplify the database schema and keep our testing honest.

We are thankful to the Head of the Department and to all the teachers of the department for the knowledge and support given during our course. We also thank the laboratory staff and department staff for providing the computing facilities we needed.

We thank our classmates and friends for testing the English and Hindi pages on mobile screens and giving useful feedback. Finally, we are grateful to our parents and families for their steady support and encouragement.

**Date:** 26 November 2026  

**(Signatures)**  
Demo Student A (`DEMO/001/26`)  
Demo Student B (`DEMO/002/26`)  

---

## CONTENTS, LIST OF FIGURES & LIST OF TABLES (Pages vii–ix)

*(Populated automatically via Word fields during build.)*
