"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { useUser } from "@/components/providers/UserContext";
import { getPrintOrders, createPrintOrder, getPrintRatesAction } from "@/actions/print.actions";
import { getPlatformSettingsAction } from "@/actions/platform.actions";
import { updateUserProfile } from "@/actions/user.actions";
import { generateUpiUrl, getUpiQrImageUrl } from "@/lib/upi";
import { formatPaiseToRupees, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Printer,
  FileText,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
  Layers,
  Phone,
  RefreshCw,
  Save,
} from "lucide-react";
import { PrintTypeEnum } from "@/lib/types";
import { DocumentUpload } from "@/components/ui/DocumentUpload";
import { PrintRatesData, calculatePrintCostPaise } from "@/lib/services/print.service";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";

const DELIVERY_LOCATIONS = [
  "Hostel Block 1 (Freshers Boys)",
  "Hostel Block 2 (Seniors Boys)",
  "Hostel Block 3 (PG & Research)",
  "Hostel Block 4 (Girls Complex A)",
  "Hostel Block 5 (Girls Complex B)",
  "Central Library Desk",
  "Main Academic Block C",
  "Cafeteria Hub",
];

const DELIVERY_WINDOWS = [
  { id: "morning", label: "Morning Drop", time: "8:30 AM - 9:00 AM" },
  { id: "lunch", label: "Lunch Drop", time: "12:50 PM - 1:30 PM" },
];

export default function PrintStationPage() {
  const { user, refreshUser } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<PrintRatesData>({
    singleSidedPaise: 250,
    doubleSidedPaise: 200,
    colorSinglePaise: 1000,
    colorDoublePaise: 800,
    singleSidedRupees: 2.5,
    doubleSidedRupees: 2.0,
  });

  // Form states
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [driveFileId, setDriveFileId] = useState("");
  const [detectedPages, setDetectedPages] = useState<number>(0);
  const [copies, setCopies] = useState<number>(1);
  const [printType, setPrintType] = useState<PrintTypeEnum>("BW_DOUBLE");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(!!user?.phone);
  const [utrNumber, setUtrNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [platformUpiId, setPlatformUpiId] = useState("otium.escrow@okhdfcbank");

  useEffect(() => {
    if (user?.phone) {
      if (!phoneNumber) setPhoneNumber(user.phone);
      setPhoneSaved(true);
    }
  }, [user?.phone]);

  const handleSavePhone = async () => {
    if (!user) {
      toast.error("Please sign in to save your phone number.");
      return;
    }
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    setSavingPhone(true);
    const res = await updateUserProfile({
      userId: user.id,
      phone: cleanPhone,
    });
    setSavingPhone(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      setPhoneSaved(true);
      toast.success("Phone number saved to your student profile!");
      if (refreshUser) refreshUser();
    }
  };

  const fetchOrders = async () => {
    if (!user?.id) return;
    setLoading(true);
    const res = await getPrintOrders(user.id);
    if (res?.success && res.data) {
      setOrders(res.data);
    }
    setLoading(false);
  };

  const fetchRates = async () => {
    const res = await getPrintRatesAction();
    if (res?.success && res.data) {
      setRates(res.data);
    }
  };

  const fetchPlatformUpi = async () => {
    const res = await getPlatformSettingsAction();
    if (res?.success && res.data?.upiId) {
      setPlatformUpiId(res.data.upiId);
    }
  };

  useEffect(() => {
    fetchRates();
    fetchPlatformUpi();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [user?.id]);

  // Pricing calculations
  const totalPagesToPrint = (detectedPages || 1) * copies;
  const baseCostPaise = calculatePrintCostPaise(detectedPages || 1, printType, rates);
  const totalCostPaise = baseCostPaise * copies;
  const totalCostRupees = totalCostPaise / 100;

  // Amount-locked UPI deep link & QR
  const upiUrl = generateUpiUrl(
    platformUpiId,
    totalCostRupees,
    "OtiumPrintStation",
    `Print_${fileName.slice(0, 12)}`
  );
  const qrImageUrl = getUpiQrImageUrl(upiUrl, 220);

  const copyUpiId = () => {
    navigator.clipboard.writeText(platformUpiId);
    setCopiedUpi(true);
    toast.success("UPI ID copied to clipboard.");
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to place a print order.");
      return;
    }

    if (!fileUrl) {
      toast.error("Please upload a PDF document first.");
      return;
    }

    if (!deliveryLocation || !deliveryLocation.trim()) {
      toast.error("Please enter a campus drop location (e.g. room number, desk, or hostel block).");
      return;
    }

    if (!deliverySlot) {
      toast.error("Please select a delivery window slot.");
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      toast.error("Please provide a valid 10-digit phone number for delivery updates.");
      return;
    }

    // Ensure phone number is updated in the database first
    if (!user.phone || user.phone !== cleanPhone) {
      try {
        await updateUserProfile({ userId: user.id, phone: cleanPhone });
        setPhoneSaved(true);
        if (refreshUser) refreshUser();
      } catch (err) {
        console.warn("Could not sync phone before print order:", err);
      }
    }

    if (!utrNumber || utrNumber.trim().length < 6) {
      toast.error("Please enter the valid 12-digit UPI transaction reference number (UTR).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createPrintOrder({
        userId: user.id,
        collegeId: user.collegeId || undefined,
        fileName: fileName || "Untitled_Document.pdf",
        fileUrl,
        driveFileId: driveFileId || "direct_cloud",
        pageCount: detectedPages || 1,
        copies,
        printType,
        deliveryLocation: `${deliveryLocation} (${deliverySlot})`,
        utr: utrNumber.trim(),
        phoneNumber: cleanPhone,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to submit print order.");
      }

      toast.success("Print order queued! The print manager has received your job.");

      // Reset form
      setFileUrl("");
      setFileName("");
      setDriveFileId("");
      setDetectedPages(0);
      setCopies(1);
      setUtrNumber("");
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || "Order submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="PRINT_STATION">
      <div className="space-y-8 pb-12">
        {/* Page Header */}
        <div className="space-y-2 border-b border-border pb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span>Hostel Express Print Dispatch</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Hostel Cloud Print Station
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Upload notes or assignments, select duplex configurations, pay via amount-locked UPI, and receive physical delivery at your hostel block.
          </p>
        </div>

        {/* Two-Column Grid: Order Submission + Rate Sheet / Active Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Card (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 sm:p-8 space-y-6">
              <form onSubmit={handleOrderSubmit} className="space-y-6">
                {/* 1. Document Upload Dropzone */}
                <DocumentUpload
                  label="1. Document File (PDF Only)"
                  onUploadComplete={(url, id, name) => {
                    setFileUrl(url);
                    setDriveFileId(id || "supabase_direct");
                    if (name) setFileName(name);
                  }}
                  onPageCountDetected={(count) => setDetectedPages(count)}
                  campusId={user?.collegeId || "global"}
                  userId={user?.id || "student"}
                  existingFileUrl={fileUrl}
                  existingFileName={fileName}
                />

                {/* 2. Print Configuration Grid */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                    2. Print Specification
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: "BW_DOUBLE", label: "B&W Double Sided", rate: rates.doubleSidedRupees },
                      { id: "BW_SINGLE", label: "B&W Single Sided", rate: rates.singleSidedRupees },
                      { id: "COLOR_DOUBLE", label: "Color Double Sided", rate: 8.0 },
                      { id: "COLOR_SINGLE", label: "Color Single Sided", rate: 10.0 },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPrintType(opt.id as PrintTypeEnum)}
                        className={`p-3 rounded-lg border text-left transition-all fluid-interactive ${
                          printType === opt.id
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card/60 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        }`}
                      >
                        <div className="font-semibold text-xs text-foreground">
                          {opt.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          ₹{opt.rate.toFixed(2)} per page
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Copies input */}
                  <div className="pt-1 flex items-center justify-between gap-4">
                    <span className="text-xs font-medium text-muted-foreground">
                      Number of Copies:
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCopies(Math.max(1, copies - 1))}
                        disabled={copies <= 1}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-xs font-bold text-foreground">
                        {copies}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCopies(copies + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 3. Delivery Location & Window */}
                <div className="space-y-4 pt-2 border-t border-border">
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                    3. Delivery Details
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                          Campus Drop Location:
                        </span>
                        <span className="text-[10px] text-muted-foreground">Open Text Field</span>
                      </div>
                      <Input
                        type="text"
                        placeholder="e.g. Hostel 3 Room 204, Library Desk 12, LT 03"
                        value={deliveryLocation}
                        onChange={(e) => setDeliveryLocation(e.target.value)}
                        required
                      />
                      <div className="flex flex-wrap gap-1 pt-1">
                        {[
                          "Hostel Block 1",
                          "Hostel Block 2",
                          "Hostel Block 3",
                          "Central Library Desk",
                          "Main Academic Block C",
                          "Cafeteria Hub",
                        ].map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => setDeliveryLocation(loc)}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
                          >
                            + {loc}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-foreground">
                        Dispatch Window:
                      </span>
                      <select
                        value={deliverySlot}
                        onChange={(e) => setDeliverySlot(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select delivery window</option>
                        {DELIVERY_WINDOWS.map((slot) => (
                          <option key={slot.id} value={slot.label}>
                            {slot.label} ({slot.time})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        Contact Phone (for delivery SMS/call):
                      </span>
                      {phoneSaved && (
                        <Badge
                          variant="outline"
                          size="sm"
                          className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1 py-0 font-medium"
                        >
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                          Saved to Account
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={phoneNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPhoneNumber(val);
                          setPhoneSaved(val.replace(/\D/g, "") === user?.phone);
                        }}
                        maxLength={10}
                        className="flex-1 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant={phoneSaved ? "secondary" : "default"}
                        size="sm"
                        onClick={handleSavePhone}
                        disabled={savingPhone || phoneNumber.replace(/\D/g, "").length !== 10}
                        isLoading={savingPhone}
                        className="flex-shrink-0"
                      >
                        {phoneSaved ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5 mr-1" />
                            Save Phone
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Save your phone number so the dispatch operator can contact you when your print job arrives.
                    </p>
                  </div>
                </div>

                {/* 4. Dynamic Amount-Locked UPI Payment */}
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                      4. UPI Payment Confirmation
                    </label>
                    <div className="text-sm font-bold text-foreground">
                      Total: ₹{totalCostRupees.toFixed(2)}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-secondary/30 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="flex justify-center">
                      <div className="p-2.5 rounded-lg bg-white border border-border shadow-xs">
                        <img
                          src={qrImageUrl}
                          alt="UPI QR Code"
                          className="w-36 h-36 object-contain"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <p className="font-semibold text-foreground">
                        Scan QR using any UPI app:
                      </p>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        GPay, PhonePe, Paytm, or BHIM. Amount is locked to ₹{totalCostRupees.toFixed(2)}.
                      </p>

                      <div className="pt-1 space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          UPI ID:
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-foreground bg-card px-2 py-1 rounded border border-border">
                          <span className="truncate">{platformUpiId}</span>
                          <button
                            type="button"
                            onClick={copyUpiId}
                            className="text-primary hover:underline ml-auto flex-shrink-0"
                          >
                            {copiedUpi ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-foreground">
                      Transaction UTR (12 digits from bank SMS / UPI receipt):
                    </span>
                    <Input
                      type="text"
                      placeholder="e.g. 423187654321"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.replace(/\s/g, ""))}
                      maxLength={18}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  isLoading={isSubmitting}
                  disabled={!fileUrl}
                >
                  Confirm & Submit Print Job (₹{totalCostRupees.toFixed(2)})
                </Button>
              </form>
            </Card>
          </div>

          {/* Right Column: Rate Information & Order Tracker (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Rates Reference */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Printer className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  Official Campus Print Tariff
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">B&W Double Sided</span>
                  <span className="font-bold text-foreground">₹{rates.doubleSidedRupees.toFixed(2)} / page</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">B&W Single Sided</span>
                  <span className="font-bold text-foreground">₹{rates.singleSidedRupees.toFixed(2)} / page</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Color Double Sided</span>
                  <span className="font-bold text-foreground">₹8.00 / page</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Color Single Sided</span>
                  <span className="font-bold text-foreground">₹10.00 / page</span>
                </div>
              </div>
            </Card>

            {/* Live Order Tracker */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="font-heading font-bold text-sm text-foreground">
                    Your Print Jobs
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={fetchOrders}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                  title="Refresh order status"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 rounded-lg bg-secondary/60 animate-pulse" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No print orders placed yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-lg border border-border bg-card/60 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {ord.fileName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDate(ord.createdAt)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            ord.status === "COMPLETED"
                              ? "success"
                              : ord.status === "PRINTING" || ord.status === "OUT_FOR_DELIVERY"
                              ? "warning"
                              : ord.status === "CANCELLED"
                              ? "destructive"
                              : "default"
                          }
                          size="sm"
                        >
                          {ord.status.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <span>
                          {ord.pageCount} pages x {ord.copies} copy
                        </span>
                        <span className="font-bold text-foreground">
                          {formatPaiseToRupees(ord.totalCost ?? ord.totalCostPaise)}
                        </span>
                      </div>

                      <div className="text-[11px] text-muted-foreground truncate">
                        Drop: {ord.deliveryLocation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ClientServiceGuard>
  );
}
