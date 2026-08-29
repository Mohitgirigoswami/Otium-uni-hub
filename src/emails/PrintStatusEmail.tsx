import React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Link,
} from "@react-email/components";

export interface PrintStatusEmailProps {
  userName?: string;
  status: "SUBMITTED" | "PRINTING" | "OUT_FOR_DELIVERY" | "COMPLETED" | "DELIVERED" | "REJECTED";
  documentName: string;
  rejectionReason?: string;
  deliveryLocation?: string;
  orderId?: string;
}

export function PrintStatusEmail({
  userName = "Student",
  status = "PRINTING",
  documentName = "Assignment.pdf",
  rejectionReason,
  deliveryLocation,
  orderId,
}: PrintStatusEmailProps) {
  const isRejected = status === "REJECTED";
  const isPrinting = status === "PRINTING";
  const isOutForDelivery = status === "OUT_FOR_DELIVERY";
  const isDelivered = status === "COMPLETED" || status === "DELIVERED";

  let statusTitle = "Order Status Update";
  let statusColor = "#0284c7"; // Blue default
  let statusBg = "#f0f9ff";
  let previewText = `Your print order for ${documentName} has been updated.`;

  if (isRejected) {
    statusTitle = "Print Order Rejected / Action Required";
    statusColor = "#e11d48"; // Rose/Red
    statusBg = "#fff1f2";
    previewText = `Action Required: Your print order for ${documentName} was rejected.`;
  } else if (isPrinting) {
    statusTitle = "Document is Currently Printing 🖨️";
    statusColor = "#059669"; // Emerald/Green
    statusBg = "#ecfdf5";
    previewText = `Great news! Your print job for ${documentName} is now printing.`;
  } else if (isOutForDelivery) {
    statusTitle = "Dispatched for Hostel Delivery 🚚";
    statusColor = "#7c3aed"; // Purple
    statusBg = "#f5f3ff";
    previewText = `Your print job for ${documentName} is out for delivery.`;
  } else if (isDelivered) {
    statusTitle = "Print Order Delivered ✅";
    statusColor = "#10b981"; // Green
    statusBg = "#ecfdf5";
    previewText = `Your print order for ${documentName} has been delivered!`;
  }

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Header Branding */}
          <Section style={headerStyle}>
            <Text style={logoTextStyle}>OTIUM UNI HUB</Text>
            <Text style={subHeaderStyle}>Hostel Cloud Print Station</Text>
          </Section>

          {/* Status Alert Banner */}
          <Section style={{ ...statusBannerStyle, backgroundColor: statusBg, borderColor: statusColor }}>
            <Heading style={{ ...statusHeadingStyle, color: statusColor }}>
              {statusTitle}
            </Heading>
            <Text style={statusSubTextStyle}>
              Order ID: <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{orderId || "N/A"}</span>
            </Text>
          </Section>

          {/* Main Body Content */}
          <Section style={contentSectionStyle}>
            <Text style={greetingTextStyle}>Hello {userName},</Text>

            {isPrinting && (
              <Text style={bodyTextStyle}>
                Your document <strong>{documentName}</strong> has been verified and is currently on the printer trays. It will be packaged and prepared for dispatch shortly.
              </Text>
            )}

            {isOutForDelivery && (
              <Text style={bodyTextStyle}>
                Your document <strong>{documentName}</strong> is out for express delivery! Our student runner is heading to your designated hostel location:
                <br />
                <strong style={{ color: "#7c3aed" }}>📍 {deliveryLocation || "Your Hostel Block"}</strong>
              </Text>
            )}

            {isDelivered && (
              <Text style={bodyTextStyle}>
                Your document <strong>{documentName}</strong> has been successfully delivered to:
                <br />
                <strong style={{ color: "#059669" }}>📍 {deliveryLocation || "Your Hostel Pickup Location"}</strong>.
                <br />
                Thank you for using Otium Print Station!
              </Text>
            )}

            {isRejected && (
              <Section style={rejectionBoxStyle}>
                <Text style={rejectionTitleStyle}>⚠️ Reason for Rejection:</Text>
                <Text style={rejectionReasonStyle}>
                  {rejectionReason || "Invalid or unverified UPI transaction UTR / Payment issue."}
                </Text>

                <Hr style={dividerStyle} />

                <Text style={disputeInstructionStyle}>
                  <strong>How to dispute or resolve:</strong>
                  <br />
                  If you have already paid, please <strong>reply directly to this email</strong> with a screenshot of your UPI payment receipt showing the 12-digit UTR number and timestamp. Our campus print manager will verify and process your order immediately.
                </Text>
              </Section>
            )}

            <Hr style={dividerStyle} />

            {/* Document Info Card */}
            <Section style={infoCardStyle}>
              <Text style={infoCardTitleStyle}>📄 Order Details</Text>
              <Text style={infoItemStyle}>
                <strong>Document:</strong> {documentName}
              </Text>
              {deliveryLocation && (
                <Text style={infoItemStyle}>
                  <strong>Destination:</strong> {deliveryLocation}
                </Text>
              )}
              <Text style={infoItemStyle}>
                <strong>Status:</strong>{" "}
                <span style={{ color: statusColor, fontWeight: "bold" }}>
                  {status.replace(/_/g, " ")}
                </span>
              </Text>
            </Section>

            <Text style={footerTextStyle}>
              Have questions? You can reach our support team or campus moderators directly via the Otium Uni Hub app.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSectionStyle}>
            <Text style={footerMutedTextStyle}>
              © {new Date().getFullYear()} Otium Uni Hub. Built for university students.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default PrintStatusEmail;

// --- Inline Styles for Maximum Email Client Compatibility ---

const mainStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: "0",
  padding: "20px 0",
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "580px",
  borderRadius: "16px",
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: "#0f172a",
  padding: "24px 32px",
  textAlign: "center",
};

const logoTextStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "900",
  letterSpacing: "2px",
  margin: "0",
};

const subHeaderStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "12px",
  fontWeight: "500",
  letterSpacing: "1px",
  margin: "4px 0 0",
  textTransform: "uppercase",
};

const statusBannerStyle: React.CSSProperties = {
  padding: "20px 32px",
  borderLeft: "5px solid",
  borderBottom: "1px solid #e2e8f0",
};

const statusHeadingStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: "800",
  margin: "0",
};

const statusSubTextStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  margin: "6px 0 0",
};

const contentSectionStyle: React.CSSProperties = {
  padding: "28px 32px",
};

const greetingTextStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0 0 16px",
};

const bodyTextStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#334155",
  margin: "0 0 16px",
};

const rejectionBoxStyle: React.CSSProperties = {
  backgroundColor: "#fff1f2",
  border: "1px solid #fecdd3",
  borderRadius: "12px",
  padding: "16px 20px",
  margin: "16px 0",
};

const rejectionTitleStyle: React.CSSProperties = {
  color: "#e11d48",
  fontWeight: "800",
  fontSize: "13px",
  margin: "0 0 6px",
  textTransform: "uppercase",
};

const rejectionReasonStyle: React.CSSProperties = {
  color: "#9f1239",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
};

const disputeInstructionStyle: React.CSSProperties = {
  color: "#475569",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "12px 0 0",
};

const dividerStyle: React.CSSProperties = {
  borderTop: "1px solid #e2e8f0",
  margin: "20px 0",
};

const infoCardStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "16px 20px",
  margin: "16px 0",
};

const infoCardTitleStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: "800",
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: "0 0 10px",
};

const infoItemStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#334155",
  margin: "4px 0",
};

const footerTextStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  lineHeight: "18px",
  margin: "20px 0 0",
};

const footerSectionStyle: React.CSSProperties = {
  backgroundColor: "#f1f5f9",
  padding: "16px 32px",
  textAlign: "center",
  borderTop: "1px solid #e2e8f0",
};

const footerMutedTextStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#94a3b8",
  margin: "0",
};
