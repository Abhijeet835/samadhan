# CHAPTER 1

## INTRODUCTION

### 1.1 Background and Motivation

People depend on local tradespeople for many everyday household tasks. A tap starts leaking, a fuse blows, a bike locks up, or a family needs help moving furniture. Finding someone trustworthy usually relies on word of mouth or calling several numbers one by one. Commercial booking apps organize a few trades, yet they often charge steep commissions, track workers continuously, or leave phone numbers open to spam.

A second problem affects whole neighbourhoods together. Damaged roads, blocked drains, dark streetlights, or uncollected garbage cannot be fixed by one household. Residents can file individual complaints on official portals such as India's Centralised Public Grievance Redress and Monitoring System (CPGRAMS) [6], though a single report is easy to overlook. Social media posts reach many eyes quickly, yet they lack location grouping, fact checks, and a clear status trail afterwards.

This project brings both problems into one web app named Samadhan v2. Shared accounts, location indexes, alerts, and admin tools support a local helper directory and a civic issue network together. Local Mode helps a resident reach a verified worker nearby without commissions. Global Mode helps neighbours turn scattered complaints into one documented, tracked case. Figure 1.1 shows both modes and the shared core below them.

```mermaid
fig1_1
```

*Figure 1.1: Overview of the Problem-Solving Platform (Samadhan v2) with Local and Global modes.*

### 1.2 Problem Statement

This work targets three everyday gaps in local service search and public issue reporting:

1. Privacy and trust gaps in local help. Visitors need nearby verified workers with honest ratings, while workers should not have their home address or mobile number exposed to public scraping.
2. Scattered and repeated civic complaints. Without a nearby duplicate check, twenty neighbours on one road submit separate reports for the same problem, drowning out one shared ticket.
3. Unclear status and lack of follow-up. Even after filing a complaint, citizens rarely see clear progress from acknowledgement to resolution or know when collective backing unlocked wider outreach.

Our goal was to build these safeguards into the backend database and API routes from day one.

### 1.3 Objectives

The main objectives achieved in the Samadhan v2 prototype are:

1. Build a free, location-aware Local Mode directory covering nine household trades, with admin verification, approximate public coordinates, Connect-gated phone reveal, and reviews allowed only after connecting.
2. Build a Global Mode issue reporting workflow that screens for open duplicates within 100 meters over the past 30 days before charging a simulated 5-rupee fee.
3. Use atomic MongoDB transactions and integer-paise math for wallet balances, 1-rupee support votes, and full refunds when an admin rejects spam.
4. Trigger two escalation tiers safely after payment commit: 200 rupees for social spotlight and 500 rupees for formal dispatch (or 20 and 50 rupees in demo mode). Repair status stays separate from the escalation tier.
5. Deliver a bilingual English and Hindi web app with offline form drafts and verify the system through live browser screenshots, automated tests, and security scans.

### 1.4 Scope and Limitations

This report covers the web app running on React 18, Node.js, Express 5, and MongoDB Atlas across 17 collections. Wallet balances hold simulated integer paise only, with no live Razorpay or UPI transfers. Authority emails and social posts save inspectable `SIMULATED` rows whenever SMTP or external keys are unset.

Medical help stays out of scope. For urgent cases, Local Mode shows a 112 helpline banner across the top. Daily Connect locks and IP rate limits live in Node server memory for a single-instance setup, and map geocoding relies on public OpenStreetMap Nominatim endpoints under a 1.1-second throttle.

### 1.5 Organisation of the Report

Chapter 2 reviews earlier studies on platforms, civic reporting, Sybil defense, and data privacy. Chapter 3 explains the Local and Global workflows, architecture, core equations, algorithms, and 17 database collections. Chapter 4 shows live browser screenshots, risk safeguards, automated test outcomes, and build metrics, and Chapter 5 summarizes conclusions and future scope.
