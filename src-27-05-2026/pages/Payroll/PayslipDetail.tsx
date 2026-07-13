import React, { useRef, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Modal from "../../components/common/Modal/Modal";
import type { Payslip } from "../../services/payrollService";
import type { RootState } from "../../store/store";
import { organizationService } from "../../services/organizationService";
import payrollService from "../../services/payrollService";
import type { OfficeLocation } from "../../types/organization.types";
import Button from "../../components/common/Button/Button";
import { Printer, Download, User, Calendar, CreditCard, MapPin, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import logo from "../../assets/nrnst-logo.png"; // Please replace this file with nrnst-logo.png

interface PayslipDetailProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: Payslip;
}

const PayslipDetail: React.FC<PayslipDetailProps> = ({ isOpen, onClose, payslip }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const employeeData = payslip.employeeId as any;
  const locationId = employeeData?.employment?.location || user?.location;

  useEffect(() => {
    const fetchLocation = async () => {
      if (!locationId) return;
      
      try {
        // If location is already an object (populated by backend)
        if (typeof locationId === "object" && locationId.address && locationId.contactInfo) {
          setOfficeLocation(locationId);
          return;
        }

        // Fetch all office locations
        const response = await organizationService.getOfficeLocations();
        const locations = response.data;
        
        if (!locations || locations.length === 0) return;

        // Try to find matching location (by ID or Name)
        const found = locations.find(loc => 
          loc._id === locationId || 
          loc.name === locationId ||
          loc.name.toLowerCase() === String(locationId).toLowerCase() ||
          loc.name.toLowerCase().includes(String(locationId).toLowerCase())
        );

        if (found) {
          setOfficeLocation(found);
        } else {
          // Fallback to headquarters if no specific match
          const hq = locations.find(loc => loc.isHeadquarters) || locations[0];
          if (hq) setOfficeLocation(hq);
        }
      } catch (error) {
        console.error("Failed to fetch office location:", error);
      }
    };

    if (isOpen) fetchLocation();
  }, [isOpen, locationId]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const windowName = "Print" + new Date().getTime();
    const printWindow = window.open("about:blank", windowName, "left=50,top=50,width=900,height=900");

    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Payslip - ${getMonthName(payslip.month)} ${payslip.year}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background: white; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 32px; margin-bottom: 40px; }
              .company-brand { display: flex; align-items: center; gap: 24px; }
              .company-logo { height: 70px; width: auto; object-fit: contain; }
              .company-info h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; }
              .company-info p { color: #64748b; font-size: 13px; line-height: 1.6; margin: 0; display: flex; align-items: center; gap: 6px; }
              .payslip-meta { text-align: right; }
              .payslip-title { font-size: 38px; font-weight: 950; color: #4f46e5; letter-spacing: -0.04em; line-height: 1; }
              .payslip-date { font-size: 14px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 8px; border-top: 2px solid #4f46e5; display: inline-block; pt: 4px; }
              
              .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
              .data-card { background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; }
              .card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
              .card-header span { font-weight: 800; font-size: 13px; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; }
              
              .data-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; }
              .data-row:last-child { border-bottom: none; }
              .data-label { color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; }
              .data-value { color: #0f172a; font-size: 14px; font-weight: 700; }

              table { width: 100%; border-collapse: collapse; margin-bottom: 40px; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
              th { background: #f1f5f9; padding: 14px 20px; font-weight: 800; font-size: 12px; color: #475569; text-transform: uppercase; text-align: left; border-bottom: 2px solid #e2e8f0; }
              td { padding: 14px 20px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #f1f5f9; }
              .text-right { text-align: right; }
              .font-bold { font-weight: 700; }
              
              .totals-row { background: #f8fafc; font-weight: 800; }
              .earnings-total { color: #059669; }
              .deductions-total { color: #dc2626; }

              .net-pay-wrapper { display: flex; justify-content: flex-end; margin-top: 48px; }
              .net-pay-card { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 32px 56px; border-radius: 20px; text-align: center; box-shadow: 0 20px 40px -10px rgba(79, 70, 229, 0.3); }
              .net-pay-label { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; opacity: 0.9; margin-bottom: 12px; }
              .net-pay-amount { font-size: 48px; font-weight: 900; letter-spacing: -0.02em; }
              .net-pay-words { font-size: 12px; opacity: 0.8; margin-top: 12px; font-style: italic; }

              .footer { margin-top: 80px; padding-top: 24px; border-top: 2px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-end; }
              .footer-legal { color: #94a3b8; font-size: 11px; max-width: 400px; line-height: 1.4; }
              .footer-brand { color: #4f46e5; font-weight: 900; font-size: 16px; letter-spacing: -0.02em; }
              
              @media print {
                body { padding: 0; }
                .net-pay-card { box-shadow: none; -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>window.onload = function() { window.print(); window.close(); }<\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleSendEmail = async () => {
    if (sendingEmail) return;
    setSendingEmail(true);
    try {
      const resp = await payrollService.sendPayslipEmail(payslip._id);
      if (resp.success) {
        alert("Payslip sent to your email successfully!");
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      alert("Failed to send payslip email. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  const getMonthName = (month: number) => {
    const date = new Date();
    date.setMonth(month - 1);
    return format(date, "MMMM");
  };

  const allowances = payslip.items.filter((item) => item.type === "ALLOWANCE");
  const deductions = payslip.items.filter((item) => item.type === "DEDUCTION");
  const maxRows = Math.max(allowances.length, deductions.length);

  const employeeName = employeeData?.personalInfo
    ? `${employeeData.personalInfo.firstName} ${employeeData.personalInfo.lastName}`
    : (user ? `${user.firstName} ${user.lastName}` : "N/A");
  const employeeIdStr = employeeData?.employment?.employeeId || user?.employeeId || "N/A";
  const designation = employeeData?.employment?.designation?.name || 
                      employeeData?.employment?.designation || 
                      user?.designation || 
                      "N/A";

  const companyAddress = officeLocation ? 
    `${officeLocation.address.street}, ${officeLocation.address.city}, ${officeLocation.address.state} - ${officeLocation.address.zipCode}` : 
    "Corporate Office, NRNST TECH PRIVATE LIMITED";
  const companyEmail = officeLocation?.contactInfo?.email || "hr@nrnst.com";
  const companyPhone = officeLocation?.contactInfo?.phone || "+91 90000 00000";

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <span>Salary Certificate — {getMonthName(payslip.month)} {payslip.year}</span>
        </div>
      }
      maxWidth="5xl"
      actions={
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            startIcon={<Mail className="w-4 h-4" />}
            onClick={handleSendEmail}
            loading={sendingEmail}
          >
            Send Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            startIcon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            variant="default"
            size="sm"
            startIcon={<Download className="w-4 h-4" />}
            onClick={handlePrint}
          >
            Download
          </Button>
        </div>
      }
    >
      <div className="p-4 sm:p-8 bg-slate-50 overflow-hidden">
        {/* Main Document Interface */}
        <div 
          ref={printRef} 
          className="bg-white rounded-3xl shadow-xl border border-slate-200 p-10 sm:p-12 overflow-hidden relative"
          style={{ minHeight: "1000px" }}
        >
          {/* Subtle Aesthetic Accents */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />
          
          {/* Header Section */}
          <div 
            className="flex flex-col md:flex-row justify-between items-start border-b-2 border-slate-100 pb-10 mb-10 relative z-10 gap-8"
            style={{ borderBottom: "2px solid #f1f5f9", paddingBottom: "40px", marginBottom: "40px" }}
          >
            {/* Brand Identity */}
            <div className="flex items-start gap-6 flex-1">
              <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                <img src={logo} alt="Logo" style={{ height: "72px", width: "auto", objectFit: "contain" }} />
              </div>
              <div className="pt-2">
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", marginBottom: "8px", margin: 0, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  NRNST TECH PRIVATE LIMITED
                </h1>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <p style={{ color: "#64748b", fontSize: "12px", margin: 0, display: "flex", alignItems: "center", gap: "6px", maxWidth: "350px" }}>
                    <MapPin style={{ width: "12px", height: "12px", opacity: 0.7 }} /> {companyAddress}
                  </p>
                  <div style={{ display: "flex", gap: "12px", marginTop: "2px" }}>
                    <p style={{ color: "#64748b", fontSize: "12px", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                      <Mail style={{ width: "12px", height: "12px", opacity: 0.7 }} /> {companyEmail}
                    </p>
                    <p style={{ color: "#64748b", fontSize: "12px", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                      <Phone style={{ width: "12px", height: "12px", opacity: 0.7 }} /> {companyPhone}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Title Meta */}
            <div style={{ textAlign: "right", alignSelf: "flex-start" }}>
              <div style={{ fontSize: "42px", fontWeight: 950, color: "#4f46e5", letterSpacing: "-0.04em", lineHeight: 1 }}>PAYSLIP</div>
              <div style={{ 
                fontSize: "14px", 
                color: "#64748b", 
                fontWeight: 800, 
                textTransform: "uppercase", 
                letterSpacing: "0.15em", 
                marginTop: "12px",
                paddingTop: "6px",
                borderTop: "3px solid #4f46e5",
                display: "inline-block"
              }}>
                {getMonthName(payslip.month)} {payslip.year}
              </div>
            </div>
          </div>

          {/* Core Information Grid */}
          <div 
            className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12 relative z-10" 
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginBottom: "40px" }}
          >
            {/* Employee Focus Card */}
            <div style={{ background: "#f8fafc", padding: "28px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <span style={{ fontWeight: 800, fontSize: "14px", color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Employee Overview</span>
              </div>
              {[
                ["Employee Name", employeeName],
                ["Employee ID", employeeIdStr],
                ["Designation", designation],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px dashed #e2e8f0" }}>
                  <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{label}</span>
                  <span style={{ color: "#0f172a", fontSize: "14px", fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Attendance & Period Card */}
            <div style={{ background: "#f8fafc", padding: "28px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <span style={{ fontWeight: 800, fontSize: "14px", color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pay Period Details</span>
              </div>
              {[
                ["Payment Mode", "Bank Transfer"],
                ["Total Month Days", String(payslip.totalDays)],
                ["Paid Working Days", String(payslip.daysWorked)],
                ["Unpaid Leave (LOP)", String(payslip.lopDays)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px dashed #e2e8f0" }}>
                  <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{label}</span>
                  <span style={{ color: "#0f172a", fontSize: "14px", fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "40px", borderRadius: "20px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
            <thead>
              <tr>
                <th style={{ background: "#f1f5f9", padding: "16px 24px", fontWeight: 800, fontSize: "12px", color: "#475569", textTransform: "uppercase", textAlign: "left", borderBottom: "2px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>Description (Earnings)</th>
                <th style={{ background: "#f1f5f9", padding: "16px 24px", fontWeight: 800, fontSize: "12px", color: "#475569", textTransform: "uppercase", textAlign: "right", borderBottom: "2px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>Amount</th>
                <th style={{ background: "#f1f5f9", padding: "16px 24px", fontWeight: 800, fontSize: "12px", color: "#475569", textTransform: "uppercase", textAlign: "left", borderBottom: "2px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>Description (Deductions)</th>
                <th style={{ background: "#f1f5f9", padding: "16px 24px", fontWeight: 800, fontSize: "12px", color: "#475569", textTransform: "uppercase", textAlign: "right", borderBottom: "2px solid #e2e8f0" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(maxRows, 4) }).map((_, i) => {
                const earn = allowances[i];
                const ded = deductions[i];
                return (
                  <tr key={i}>
                    <td style={{ padding: "14px 24px", fontSize: "14px", color: "#334155", borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #e2e8f0" }}>{earn?.name || ""}</td>
                    <td style={{ padding: "14px 24px", fontSize: "14px", color: "#0f172a", borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #e2e8f0", textAlign: "right", fontWeight: 700 }}>{earn ? `₹ ${earn.amount.toLocaleString()}` : ""}</td>
                    <td style={{ padding: "14px 24px", fontSize: "14px", color: "#334155", borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #e2e8f0" }}>{ded?.name || ""}</td>
                    <td style={{ padding: "14px 24px", fontSize: "14px", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontWeight: 700, color: ded ? "#dc2626" : "#0f172a" }}>{ded ? `₹ ${ded.amount.toLocaleString()}` : ""}</td>
                  </tr>
                );
              })}
              {/* Specialized Totals Bottom Row */}
              <tr style={{ background: "#f8fafc", fontWeight: 800 }}>
                <td style={{ padding: "20px 24px", fontSize: "13px", borderRight: "1px solid #e2e8f0", color: "#059669" }}>TOTAL GROSS EARNINGS</td>
                <td style={{ padding: "20px 24px", fontSize: "16px", borderRight: "1px solid #e2e8f0", textAlign: "right", color: "#059669" }}>₹ {payslip.grossEarnings.toLocaleString()}</td>
                <td style={{ padding: "20px 24px", fontSize: "13px", borderRight: "1px solid #e2e8f0", color: "#dc2626" }}>TOTAL DEDUCTIONS</td>
                <td style={{ padding: "20px 24px", fontSize: "16px", textAlign: "right", color: "#dc2626" }}>₹ {payslip.totalDeductions.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          {/* Significant Net Pay Summary Card */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "48px" }}>
            <div style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "white", padding: "32px 56px", borderRadius: "24px", textAlign: "center", boxShadow: "0 20px 50px -12px rgba(79, 70, 229, 0.4)", minWidth: "360px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.9, marginBottom: "12px" }}>Net Payable Salary</div>
              <div style={{ fontSize: "48px", fontWeight: 900, letterSpacing: "-0.02em" }}>₹ {payslip.netPay.toLocaleString()}</div>
              <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "12px", fontStyle: "italic", fontWeight: 500 }}>
                In words: Rupees {numberToWords(payslip.netPay)} only
              </div>
            </div>
          </div>

          {/* Legal Footer & Branding */}
          <div style={{ marginTop: "80px", paddingTop: "24px", borderTop: "2px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <p style={{ color: "#94a3b8", fontSize: "11px", margin: 0, maxWidth: "450px", lineHeight: "1.4" }}>
                This is a system-generated salary slip and does not require a physical signature. 
              </p>
              <p style={{ color: "#cbd5e1", fontSize: "10px", margin: 0 }}>
                Generated on: {format(new Date(), "PPPpp")}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ color: "#4f46e5", fontWeight: 900, fontSize: "18px", letterSpacing: "-0.01em" }}>NRNST TECH</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  if (num === 0) return "Zero";
  
  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
    return String(n);
  };
  
  return convert(num);
}

export default PayslipDetail;
