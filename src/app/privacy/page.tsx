import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShieldCheck, Lock, Eye, Server } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Otium Uni Hub",
  description: "Privacy policy and student data retention guidelines for Otium Uni Hub.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2 border-b border-border pb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>Data Protection & Privacy</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Last Updated: August 2026. How we collect, safeguard, and isolate your campus data.
        </p>
      </div>

      {/* Policy Sections */}
      <div className="space-y-6 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              1. Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              We collect the minimal data necessary to fulfill university services:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Profile Information:</strong> Name, university institutional email, college affiliate ID, department, and academic year received via Google OAuth single sign-on.
              </li>
              <li>
                <strong>Operational Data:</strong> Optional contact phone number to facilitate physical hostel delivery notifications for print orders and marketplace sales.
              </li>
              <li>
                <strong>Academic Utility Records:</strong> Attendance entries and CGPA credit worksheets stored securely within your private user profile partition.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              2. Print Document Storage & Automated Deletion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              Documents uploaded for print processing are streamed directly to isolated cloud storage buckets without passing through intermediary application server memory.
            </p>
            <p>
              Uploaded print PDFs are retained only for the duration required for physical dispatch verification and are scheduled for automated purge upon order completion. Uncompleted draft uploads are cleared via beacon cleanup routines.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              3. Whisper Wall Anonymity Architecture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              Public posts, reactions, and direct whisper messaging use client-side pseudonym handles (e.g., student-selected aliases and generated avatar hashes).
            </p>
            <p>
              Your real identity is never exposed to other students in the feed, comment threads, or anonymous chat sessions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              4. Payment & Financial Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              Otium does not store debit card, credit card, or net banking credentials. Payments are executed via external peer UPI applications. We record only the UPI transaction reference number (UTR) and paid amount for ledger reconciliation.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              5. Data Retention & Account Deletion Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              Students may request account termination and full data scrubbing at any time by filing a support ticket through the Campus Helpdesk. Upon verification, profile records, attendance logs, and chat histories are permanently expunged.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
