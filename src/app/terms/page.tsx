import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShieldCheck, FileText, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Terms and Conditions | Otium Uni Hub",
  description: "Terms of Service and campus operational guidelines for Otium Uni Hub users.",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2 border-b border-border pb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span>Legal Documentation</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Terms and Conditions
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Effective Date: August 2026. Applicable to all registered students, campus print managers, and university moderators.
        </p>
      </div>

      {/* Content Sections */}
      <div className="space-y-6 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              1. Acceptance of Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              By accessing, registering for, or utilizing the Otium Uni Hub web application and associated campus services, you confirm that you are an actively enrolled university student, faculty member, or authorized campus operator, and that you agree to be bound by these Terms and Conditions.
            </p>
            <p>
              If you do not agree with any provision contained herein, you must immediately discontinue use of the platform.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              2. Campus Cloud Print Station Policies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Order Placement & Verification:</strong> All print orders placed via the Print Station require accurate page specification and file submission. The platform automatically calculates rates based on detected document length and selected configuration (Single-sided, Double-sided, Black & White, or Color).
            </p>
            <p>
              <strong>Payment Confirmation:</strong> Orders are queued only upon entry of a valid bank UPI Unique Transaction Reference (UTR). Submitting fabricated or duplicate UTR numbers constitutes platform fraud and results in immediate account suspension.
            </p>
            <p>
              <strong>Turnaround and Collection:</strong> Print jobs are dispatched per designated delivery slots (Morning Drop: 8:30 AM to 9:00 AM; Lunch Drop: 12:50 PM to 1:30 PM) to specified hostel blocks or campus desks. Customers must verify their order bundle at the time of pickup.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              3. P2P Task Marketplace and Escrow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Escrow Protection:</strong> Otium operates a managed proxy escrow mechanism for student freelance assignments. Funds deposited by the task creator are locked until deliverables are submitted and reviewed.
            </p>
            <p>
              <strong>Deliverable Approvals:</strong> Clients have up to 48 hours to request revisions or approve submitted work. If no dispute is filed within this window, the platform automatically disburses the settlement to the assigned task performer.
            </p>
            <p>
              <strong>Disputes:</strong> In the event of non-delivery, plagiarism, or incomplete work, either party may open a moderation ticket through the Campus Helpdesk. The ruling of the campus moderation team is final.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              4. Anonymous Whisper Wall Code of Conduct
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Zero Harassment Tolerance:</strong> The Whisper Wall is engineered for constructive student discourse, campus advice, confessions, and university banter. Targeted harassment, doxxing of individuals, hate speech, sharing non-consensual media, or defamatory accusations will result in an immediate and irreversible ban.
            </p>
            <p>
              <strong>Pseudonymity:</strong> While user handles are masked with pseudonyms on public feeds, audit records linking university accounts to posts are maintained for legal compliance in cases of verified cyberbullying or safety hazards.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              5. Student Peer Marketplace & Rideshare
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Direct Peer Transactions:</strong> Otium provides a venue for students to list second-hand academic items, textbooks, electronics, and split cab rides. Otium does not take custody of physical items and is not liable for item defects or unfulfilled split obligations.
            </p>
            <p>
              <strong>Prohibited Items:</strong> Listing illegal substances, stolen campus property, firearms, or counterfeit examination materials is strictly prohibited.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              6. Disciplinary Enforcement & Sanctions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              Violations of these terms may result in formal warnings, temporary feature restrictions, permanent account termination, and reporting to relevant university disciplinary committees where applicable.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
