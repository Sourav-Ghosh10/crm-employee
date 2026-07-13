import React, { useRef, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Modal from "../../components/common/Modal/Modal";
import type { Payslip } from "../../services/payrollService";
import type { RootState } from "../../store/store";
import { organizationService } from "../../services/organizationService";
import payrollService from "../../services/payrollService";
import type { OfficeLocation } from "../../types/organization.types";
import Button from "../../components/common/Button/Button";
import { Printer, Download, Mail } from "lucide-react";
import { format } from "date-fns";
import { downloadPayslipAsPDF } from "../../utils/pdfGenerator";

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

  const handleDownload = () => {
    downloadPayslipAsPDF(payslip, employeeData, user, officeLocation);
  };

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
              body {
                font-family: Arial, sans-serif;
                font-size: 11px;
                color: #000;
                margin: 0;
                padding: 20px;
              }
              .payslip-container {
                border: 1px solid #000;
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
              }
              .header {
                text-align: center;
                padding: 10px;
                border-bottom: 1px solid #000;
              }
              .company-name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .company-address {
                font-size: 10px;
                margin-bottom: 10px;
              }
              .payslip-title {
                font-weight: bold;
                font-size: 12px;
                margin-top: 5px;
              }
              .details-section {
                display: flex;
                border-bottom: 1px solid #000;
              }
              .details-left, .details-right {
                flex: 1;
                padding: 10px;
              }
              .details-right {
                border-left: 1px solid #000;
              }
              .detail-row {
                display: flex;
                margin-bottom: 3px;
              }
              .detail-label {
                width: 140px;
              }
              .detail-value {
                flex: 1;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                border-bottom: 1px solid #000;
                border-right: 1px solid #000;
                padding: 5px 10px;
                text-align: left;
              }
              th:last-child, td:last-child {
                border-right: none;
              }
              th {
                font-weight: bold;
                text-align: center;
              }
              .text-right {
                text-align: right;
              }
              .total-row {
                font-weight: bold;
              }
              .total-row td {
                border-bottom: 1px solid #000;
              }
              .net-pay-row {
                border-bottom: 1px solid #000;
                padding: 5px 10px;
              }
              .net-pay-amount {
                font-weight: bold;
              }
              .amount-words {
                font-style: italic;
                padding: 5px 10px;
                border-bottom: 1px solid #000;
              }
              .footer {
                text-align: center;
                padding: 10px;
                font-size: 10px;
              }
              .print-date {
                font-size: 10px;
                margin-top: 20px;
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
    : (user ? `${user.firstName} ${user.lastName}` : "");
  const employeeIdStr = employeeData?.employment?.employeeId || user?.employeeId || "";
  const designation = employeeData?.employment?.designation?.name || 
                      employeeData?.employment?.designation || 
                      user?.designation || 
                      "";
  const department = employeeData?.employment?.department?.name || 
                     employeeData?.employment?.department || 
                     user?.department || 
                     "";
  const joinDate = employeeData?.employment?.joinDate 
    ? format(new Date(employeeData.employment.joinDate), "dd MMM yyyy") 
    : "";
  const locationName = officeLocation?.name || employeeData?.employment?.location || "";
  const bankName = employeeData?.bankDetails?.bankName || "";
  const bankAccount = employeeData?.bankDetails?.accountNumber || "";
  const panNumber = employeeData?.personalInfo?.panNumber || "";
  const pfNo = employeeData?.employment?.pfNumber || "";
  const pfUan = employeeData?.employment?.uanNumber || "";

  const companyName = "NRNST TECH PRIVATE LIMITED";
  const companyAddress = officeLocation ? 
    `${officeLocation.address.street}, ${officeLocation.address.city}, ${officeLocation.address.state} - ${officeLocation.address.zipCode}` : 
    "";

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Payslip Details"
      maxWidth="4xl"
      actions={
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            startIcon={<Mail className="w-4 h-4" />}
            onClick={handleSendEmail}
            loading={sendingEmail}
          >
            Email
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
            onClick={handleDownload}
          >
            Download PDF
          </Button>
        </div>
      }
    >
      <div className="p-4 sm:p-8 bg-slate-50 overflow-auto flex justify-center">
        {/* Main Document Interface */}
        <div 
          ref={printRef} 
          style={{ 
            fontFamily: "Arial, sans-serif", 
            fontSize: "11px", 
            color: "#000", 
            backgroundColor: "#fff", 
            width: "100%", 
            maxWidth: "800px", 
            padding: "20px" 
          }}
        >
          <div style={{ border: "1px solid #000" }}>
            
            {/* Header Section */}
            <div style={{ textAlign: "center", padding: "10px", borderBottom: "1px solid #000" }}>
              <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "4px" }}>
                {companyName}
              </div>
              <div style={{ fontSize: "10px", marginBottom: "8px" }}>
                {companyAddress}
              </div>
              <div style={{ fontWeight: "bold", fontSize: "12px", marginTop: "8px" }}>
                Payslip for the month of {getMonthName(payslip.month)} {payslip.year}
              </div>
            </div>

            {/* Employee Details Section */}
            <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
              <div style={{ flex: 1, padding: "8px" }}>
                <div style={{ display: "flex", marginBottom: "2px" }}><div style={{ width: "130px" }}>Name:</div><div>{employeeName}</div></div>
                <div style={{ display: "flex", marginBottom: "2px" }}><div style={{ width: "130px" }}>Joining Date:</div><div>{joinDate}</div></div>
                <div style={{ display: "flex", marginBottom: "2px" }}><div style={{ width: "130px" }}>Designation:</div><div>{designation}</div></div>
                <div style={{ display: "flex", marginBottom: "2px" }}><div style={{ width: "130px" }}>Department:</div><div>{department}</div></div>
                <div style={{ display: "flex", marginBottom: "2px" }}><div style={{ width: "130px" }}>Location:</div><div>{locationName}</div></div>
                <div style={{ display: "flex", marginBottom: "2px" }}><div style={{ width: "130px" }}>Effective Work Days:</div><div>{payslip.daysWorked}</div></div>
                <div style={{ display: "flex", marginBottom: "2px" }}><div style={{ width: "130px" }}>LOP:</div><div>{payslip.lopDays}</div></div>
              </div>
              <div style={{ flex: 1, padding: "8px", borderLeft: "1px solid #000" }}>
                <div style={{ display: "flex", marginBottom: "2px" }}><div style={{ width: "130px" }}>Employee No:</div><div>{employeeIdStr}</div></div>
                <div style={{ display: "flex", marginBottom: "2px" }}><div style={{ width: "130px" }}>Bank Name:</div><div>{bankName}</div></div>
                <div style={{ display: "flex", marginBottom: "2px" }}><div style={{ width: "130px" }}>Bank Account No:</div><div>{bankAccount}</div></div>
                <div style={{ display: "flex", marginBottom: "2px" }}><div style={{ width: "130px" }}>PAN Number:</div><div>{panNumber}</div></div>
                <div style={{ display: "flex", marginBottom: "2px" }}><div style={{ width: "130px" }}>PF No:</div><div>{pfNo}</div></div>
                <div style={{ display: "flex", marginBottom: "2px" }}><div style={{ width: "130px" }}>PF UAN:</div><div>{pfUan}</div></div>
              </div>
            </div>

            {/* Salary Table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "4px 8px", textAlign: "center", fontWeight: "bold" }}>Earnings</th>
                  <th style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "4px 8px", textAlign: "right", width: "80px", fontWeight: "bold" }}>Full</th>
                  <th style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "4px 8px", textAlign: "right", width: "80px", fontWeight: "bold" }}>Actual</th>
                  <th style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "4px 8px", textAlign: "center", fontWeight: "bold" }}>Deductions</th>
                  <th style={{ borderBottom: "1px solid #000", padding: "4px 8px", textAlign: "right", width: "80px", fontWeight: "bold" }}>Actual</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(maxRows, 5) }).map((_, i) => {
                  const earn = allowances[i];
                  const ded = deductions[i];
                  return (
                    <tr key={i}>
                      <td style={{ borderRight: "1px solid #000", padding: "4px 8px" }}>{earn?.name || ""}</td>
                      <td style={{ borderRight: "1px solid #000", padding: "4px 8px", textAlign: "right" }}>{earn ? Math.round(earn.amount) : ""}</td>
                      <td style={{ borderRight: "1px solid #000", padding: "4px 8px", textAlign: "right" }}>{earn ? Math.round(earn.amount) : ""}</td>
                      <td style={{ borderRight: "1px solid #000", padding: "4px 8px" }}>{ded?.name || ""}</td>
                      <td style={{ padding: "4px 8px", textAlign: "right" }}>{ded ? Math.round(ded.amount) : ""}</td>
                    </tr>
                  );
                })}
                <tr style={{ fontWeight: "bold", borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
                  <td style={{ borderRight: "1px solid #000", padding: "4px 8px" }}>Total Earnings:INR.</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px 8px", textAlign: "right" }}>{Math.round(payslip.grossEarnings)}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px 8px", textAlign: "right" }}>{Math.round(payslip.grossEarnings)}</td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px 8px" }}>Total Deductions:INR.</td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>{Math.round(payslip.totalDeductions)}</td>
                </tr>
              </tbody>
            </table>

            {/* Net Pay */}
            <div style={{ padding: "6px 8px", borderBottom: "1px solid #000" }}>
              Net Pay for the month ( Total Earnings - Total Deductions): <span style={{ fontWeight: "bold", marginLeft: "10px" }}>{Math.round(payslip.netPay)}</span>
            </div>
            <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontStyle: "italic" }}>
              (Rupees {numberToWords(Math.round(payslip.netPay))} Only)
            </div>

            {/* Footer Text */}
            <div style={{ textAlign: "center", padding: "8px", fontSize: "10px" }}>
              This is a system generated payslip and does not require signature.
            </div>
          </div>
          
          <div style={{ fontSize: "10px", marginTop: "20px" }}>
            Print Date:{format(new Date(), "dd MMM yyyy, hh:mm a")}
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
